from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId
from datetime import datetime

from app.models import (
    PoolBetCreate, PoolBetResponse, PoolBetJoin, PoolBetEntryResponse,
    PoolBetResolve, NotificationResponse
)
from app.auth import get_current_user
from app.database import get_database

router = APIRouter(prefix="/api/organizations", tags=["pool_bets"])


async def verify_org_member(db, org_id: str, user_id: ObjectId):
    """Verify user is a member of the organization"""
    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    member = await db.organization_members.find_one({
        "organization_id": ObjectId(org_id),
        "user_id": user_id
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    return member


async def verify_org_admin(db, org_id: str, user_id: ObjectId):
    """Verify user is an admin of the organization"""
    member = await verify_org_member(db, org_id, user_id)
    if not member.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return member


async def send_notification(db, user_id: ObjectId, message: str, bet_id=None, org_id=None):
    """Send a notification to a user"""
    notification = {
        "user_id": user_id,
        "message": message,
        "bet_id": bet_id,
        "organization_id": org_id,
        "read": False,
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notification)


@router.post("/{org_id}/bets", response_model=PoolBetResponse)
async def create_pool_bet(
    org_id: str,
    bet_data: PoolBetCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new pool bet in an organization"""
    db = await get_database()
    member = await verify_org_member(db, org_id, current_user["_id"])

    # Validate bet type requirements
    if bet_data.bet_type == "fixed":
        if not bet_data.fixed_fee or bet_data.fixed_fee <= 0:
            raise HTTPException(status_code=400, detail="Fixed fee required for fixed type bets")
        yes_pool = 0
        no_pool = 0
    else:  # variable
        if not bet_data.min_fee or bet_data.min_fee <= 0:
            raise HTTPException(status_code=400, detail="Minimum fee required for variable type bets")
        if not bet_data.seed_yes or not bet_data.seed_no:
            raise HTTPException(status_code=400, detail="Seed amounts required for variable type bets")
        if bet_data.seed_yes <= 0 or bet_data.seed_no <= 0:
            raise HTTPException(status_code=400, detail="Seed amounts must be positive")

        total_seed = bet_data.seed_yes + bet_data.seed_no
        if member["token_balance"] < total_seed:
            raise HTTPException(status_code=400, detail="Insufficient tokens for seed amounts")

        # Deduct seed tokens from creator
        await db.organization_members.update_one(
            {"organization_id": ObjectId(org_id), "user_id": current_user["_id"]},
            {"$inc": {"token_balance": -total_seed}}
        )
        yes_pool = bet_data.seed_yes
        no_pool = bet_data.seed_no

    bet_dict = {
        "organization_id": ObjectId(org_id),
        "title": bet_data.title,
        "description": bet_data.description,
        "bet_type": bet_data.bet_type,
        "fixed_fee": bet_data.fixed_fee if bet_data.bet_type == "fixed" else None,
        "min_fee": bet_data.min_fee if bet_data.bet_type == "variable" else None,
        "status": "open",
        "resolved_outcome": None,
        "yes_pool": yes_pool,
        "no_pool": no_pool,
        "yes_count": 0,
        "no_count": 0,
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow()
    }

    result = await db.pool_bets.insert_one(bet_dict)

    return PoolBetResponse(
        id=str(result.inserted_id),
        organization_id=org_id,
        title=bet_data.title,
        description=bet_data.description,
        bet_type=bet_data.bet_type,
        fixed_fee=bet_dict["fixed_fee"],
        min_fee=bet_dict["min_fee"],
        status="open",
        resolved_outcome=None,
        yes_pool=yes_pool,
        no_pool=no_pool,
        yes_count=0,
        no_count=0,
        created_by=str(current_user["_id"]),
        created_at=bet_dict["created_at"]
    )


@router.get("/{org_id}/bets", response_model=List[PoolBetResponse])
async def list_pool_bets(
    org_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List all pool bets in an organization"""
    db = await get_database()
    await verify_org_member(db, org_id, current_user["_id"])

    bets_cursor = db.pool_bets.find({
        "organization_id": ObjectId(org_id)
    }).sort("created_at", -1)

    bets = []
    async for bet in bets_cursor:
        # Check if current user has bet
        user_entry = await db.pool_bet_entries.find_one({
            "bet_id": bet["_id"],
            "user_id": current_user["_id"]
        })

        bets.append(PoolBetResponse(
            id=str(bet["_id"]),
            organization_id=org_id,
            title=bet["title"],
            description=bet["description"],
            bet_type=bet["bet_type"],
            fixed_fee=bet.get("fixed_fee"),
            min_fee=bet.get("min_fee"),
            status=bet["status"],
            resolved_outcome=bet.get("resolved_outcome"),
            yes_pool=bet["yes_pool"],
            no_pool=bet["no_pool"],
            yes_count=bet["yes_count"],
            no_count=bet["no_count"],
            created_by=str(bet["created_by"]),
            created_at=bet["created_at"],
            user_bet={"side": user_entry["side"], "amount": user_entry["amount"]} if user_entry else None
        ))

    return bets


@router.get("/{org_id}/bets/{bet_id}", response_model=PoolBetResponse)
async def get_pool_bet(
    org_id: str,
    bet_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific pool bet"""
    db = await get_database()
    await verify_org_member(db, org_id, current_user["_id"])

    if not ObjectId.is_valid(bet_id):
        raise HTTPException(status_code=400, detail="Invalid bet ID")

    bet = await db.pool_bets.find_one({
        "_id": ObjectId(bet_id),
        "organization_id": ObjectId(org_id)
    })

    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    user_entry = await db.pool_bet_entries.find_one({
        "bet_id": bet["_id"],
        "user_id": current_user["_id"]
    })

    return PoolBetResponse(
        id=str(bet["_id"]),
        organization_id=org_id,
        title=bet["title"],
        description=bet["description"],
        bet_type=bet["bet_type"],
        fixed_fee=bet.get("fixed_fee"),
        min_fee=bet.get("min_fee"),
        status=bet["status"],
        resolved_outcome=bet.get("resolved_outcome"),
        yes_pool=bet["yes_pool"],
        no_pool=bet["no_pool"],
        yes_count=bet["yes_count"],
        no_count=bet["no_count"],
        created_by=str(bet["created_by"]),
        created_at=bet["created_at"],
        user_bet={"side": user_entry["side"], "amount": user_entry["amount"]} if user_entry else None
    )


@router.post("/{org_id}/bets/{bet_id}/join")
async def join_pool_bet(
    org_id: str,
    bet_id: str,
    join_data: PoolBetJoin,
    current_user: dict = Depends(get_current_user)
):
    """Join a pool bet"""
    db = await get_database()
    member = await verify_org_member(db, org_id, current_user["_id"])

    if not ObjectId.is_valid(bet_id):
        raise HTTPException(status_code=400, detail="Invalid bet ID")

    bet = await db.pool_bets.find_one({
        "_id": ObjectId(bet_id),
        "organization_id": ObjectId(org_id)
    })

    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    if bet["status"] != "open":
        raise HTTPException(status_code=400, detail="Bet is not open for joining")

    # Check if user already bet
    existing = await db.pool_bet_entries.find_one({
        "bet_id": ObjectId(bet_id),
        "user_id": current_user["_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="You have already placed a bet")

    # Determine amount
    if bet["bet_type"] == "fixed":
        amount = bet["fixed_fee"]
    else:
        if not join_data.amount:
            raise HTTPException(status_code=400, detail="Amount required for variable bets")
        if join_data.amount < bet["min_fee"]:
            raise HTTPException(status_code=400, detail=f"Minimum bet is {bet['min_fee']} tokens")
        amount = join_data.amount

    # Check balance
    if member["token_balance"] < amount:
        raise HTTPException(status_code=400, detail="Insufficient tokens")

    # Deduct tokens
    await db.organization_members.update_one(
        {"organization_id": ObjectId(org_id), "user_id": current_user["_id"]},
        {"$inc": {"token_balance": -amount}}
    )

    # Add entry
    entry = {
        "bet_id": ObjectId(bet_id),
        "user_id": current_user["_id"],
        "side": join_data.side,
        "amount": amount,
        "placed_at": datetime.utcnow()
    }
    await db.pool_bet_entries.insert_one(entry)

    # Update bet pools
    pool_field = "yes_pool" if join_data.side == "YES" else "no_pool"
    count_field = "yes_count" if join_data.side == "YES" else "no_count"
    await db.pool_bets.update_one(
        {"_id": ObjectId(bet_id)},
        {"$inc": {pool_field: amount, count_field: 1}}
    )

    return {"message": f"Successfully bet {amount} tokens on {join_data.side}"}


@router.post("/{org_id}/bets/{bet_id}/lock")
async def lock_pool_bet(
    org_id: str,
    bet_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Lock a pool bet (creator only) - no more bets allowed"""
    db = await get_database()
    await verify_org_member(db, org_id, current_user["_id"])

    if not ObjectId.is_valid(bet_id):
        raise HTTPException(status_code=400, detail="Invalid bet ID")

    bet = await db.pool_bets.find_one({
        "_id": ObjectId(bet_id),
        "organization_id": ObjectId(org_id)
    })

    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    if bet["created_by"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can lock the bet")

    if bet["status"] != "open":
        raise HTTPException(status_code=400, detail="Bet is not open")

    await db.pool_bets.update_one(
        {"_id": ObjectId(bet_id)},
        {"$set": {"status": "locked"}}
    )

    return {"message": "Bet locked successfully"}


@router.post("/{org_id}/bets/{bet_id}/resolve")
async def resolve_pool_bet(
    org_id: str,
    bet_id: str,
    resolve_data: PoolBetResolve,
    current_user: dict = Depends(get_current_user)
):
    """Resolve a pool bet and distribute winnings"""
    db = await get_database()
    await verify_org_member(db, org_id, current_user["_id"])

    if not ObjectId.is_valid(bet_id):
        raise HTTPException(status_code=400, detail="Invalid bet ID")

    bet = await db.pool_bets.find_one({
        "_id": ObjectId(bet_id),
        "organization_id": ObjectId(org_id)
    })

    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    if bet["created_by"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only the creator can resolve the bet")

    if bet["status"] == "resolved":
        raise HTTPException(status_code=400, detail="Bet is already resolved")

    outcome = resolve_data.outcome
    total_pool = bet["yes_pool"] + bet["no_pool"]
    winning_pool = bet["yes_pool"] if outcome == "YES" else bet["no_pool"]

    # Get all winning entries
    winning_entries = await db.pool_bet_entries.find({
        "bet_id": ObjectId(bet_id),
        "side": outcome
    }).to_list(None)

    # Distribute winnings
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})

    for entry in winning_entries:
        if winning_pool > 0:
            # Proportional share of the total pool
            share = (entry["amount"] / winning_pool) * total_pool
        else:
            share = entry["amount"]  # Refund if no one bet on winning side

        await db.organization_members.update_one(
            {"organization_id": ObjectId(org_id), "user_id": entry["user_id"]},
            {"$inc": {"token_balance": share}}
        )

        # Send notification
        user = await db.users.find_one({"_id": entry["user_id"]})
        await send_notification(
            db,
            entry["user_id"],
            f"You won {share:.2f} tokens on \"{bet['title']}\"!",
            bet_id=str(bet["_id"]),
            org_id=org_id
        )

    # Notify losers
    losing_entries = await db.pool_bet_entries.find({
        "bet_id": ObjectId(bet_id),
        "side": "NO" if outcome == "YES" else "YES"
    }).to_list(None)

    for entry in losing_entries:
        await send_notification(
            db,
            entry["user_id"],
            f"The bet \"{bet['title']}\" resolved to {outcome}. Better luck next time!",
            bet_id=str(bet["_id"]),
            org_id=org_id
        )

    # Update bet status
    await db.pool_bets.update_one(
        {"_id": ObjectId(bet_id)},
        {"$set": {"status": "resolved", "resolved_outcome": outcome}}
    )

    return {"message": f"Bet resolved to {outcome}. Winnings distributed."}


@router.get("/{org_id}/bets/{bet_id}/entries", response_model=List[PoolBetEntryResponse])
async def get_bet_entries(
    org_id: str,
    bet_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all entries for a pool bet"""
    db = await get_database()
    await verify_org_member(db, org_id, current_user["_id"])

    if not ObjectId.is_valid(bet_id):
        raise HTTPException(status_code=400, detail="Invalid bet ID")

    entries_cursor = db.pool_bet_entries.find({"bet_id": ObjectId(bet_id)})
    entries = []

    async for entry in entries_cursor:
        user = await db.users.find_one({"_id": entry["user_id"]})
        entries.append(PoolBetEntryResponse(
            user_id=str(entry["user_id"]),
            user_name=user["name"] if user else "Unknown",
            side=entry["side"],
            amount=entry["amount"],
            placed_at=entry["placed_at"]
        ))

    return entries


@router.post("/{org_id}/bets/{bet_id}/undo")
async def undo_bet_resolution(
    org_id: str,
    bet_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Undo a bet resolution and refund everyone (admin only)"""
    db = await get_database()
    await verify_org_admin(db, org_id, current_user["_id"])

    if not ObjectId.is_valid(bet_id):
        raise HTTPException(status_code=400, detail="Invalid bet ID")

    bet = await db.pool_bets.find_one({
        "_id": ObjectId(bet_id),
        "organization_id": ObjectId(org_id)
    })

    if not bet:
        raise HTTPException(status_code=404, detail="Bet not found")

    if bet["status"] != "resolved":
        raise HTTPException(status_code=400, detail="Bet is not resolved")

    # Get all entries and calculate what needs to be undone
    entries = await db.pool_bet_entries.find({"bet_id": ObjectId(bet_id)}).to_list(None)

    outcome = bet["resolved_outcome"]
    total_pool = bet["yes_pool"] + bet["no_pool"]
    winning_pool = bet["yes_pool"] if outcome == "YES" else bet["no_pool"]

    # Reverse the winnings from winners
    for entry in entries:
        if entry["side"] == outcome:
            if winning_pool > 0:
                share = (entry["amount"] / winning_pool) * total_pool
            else:
                share = entry["amount"]
            # Take back winnings
            await db.organization_members.update_one(
                {"organization_id": ObjectId(org_id), "user_id": entry["user_id"]},
                {"$inc": {"token_balance": -share}}
            )

        # Refund original bet to everyone
        await db.organization_members.update_one(
            {"organization_id": ObjectId(org_id), "user_id": entry["user_id"]},
            {"$inc": {"token_balance": entry["amount"]}}
        )

        # Notify
        await send_notification(
            db,
            entry["user_id"],
            f"The bet \"{bet['title']}\" resolution was undone. Your {entry['amount']:.2f} tokens have been refunded.",
            bet_id=str(bet["_id"]),
            org_id=org_id
        )

    # Reset bet status
    await db.pool_bets.update_one(
        {"_id": ObjectId(bet_id)},
        {"$set": {"status": "open", "resolved_outcome": None}}
    )

    return {"message": "Resolution undone. All bets refunded."}


@router.post("/{org_id}/members/{user_id}/balance")
async def edit_member_balance(
    org_id: str,
    user_id: str,
    new_balance: float,
    current_user: dict = Depends(get_current_user)
):
    """Edit a member's token balance (admin only)"""
    db = await get_database()
    await verify_org_admin(db, org_id, current_user["_id"])

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")

    member = await db.organization_members.find_one({
        "organization_id": ObjectId(org_id),
        "user_id": ObjectId(user_id)
    })

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.organization_members.update_one(
        {"organization_id": ObjectId(org_id), "user_id": ObjectId(user_id)},
        {"$set": {"token_balance": new_balance}}
    )

    return {"message": f"Balance updated to {new_balance}"}
