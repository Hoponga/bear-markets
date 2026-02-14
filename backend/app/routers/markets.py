from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId
from datetime import datetime

from app.models import MarketCreate, MarketResponse, MarketResolve, OrderbookResponse, PrivateMarketCreate
from app.auth import get_current_user, get_current_admin
from app.database import get_database

router = APIRouter(prefix="/api/markets", tags=["markets"])


@router.get("", response_model=List[MarketResponse])
async def list_markets(status_filter: str = "active"):
    """List all PUBLIC markets (private markets not included)"""
    db = await get_database()

    query = {"is_private": {"$ne": True}}  # Exclude private markets
    if status_filter:
        query["status"] = status_filter

    markets_cursor = db.markets.find(query).sort("created_at", -1)
    markets = []

    async for market in markets_cursor:
        markets.append(MarketResponse(
            id=str(market["_id"]),
            title=market["title"],
            description=market["description"],
            created_at=market["created_at"],
            resolution_date=market["resolution_date"],
            status=market["status"],
            resolved_outcome=market.get("resolved_outcome"),
            current_yes_price=market.get("current_yes_price", 0.5),
            current_no_price=market.get("current_no_price", 0.5),
            total_volume=market.get("total_volume", 0.0),
            is_private=market.get("is_private", False),
            invite_code=market.get("invite_code")
        ))

    return markets


@router.get("/{market_id}", response_model=MarketResponse)
async def get_market(market_id: str):
    """Get market details"""
    db = await get_database()

    if not ObjectId.is_valid(market_id):
        raise HTTPException(status_code=400, detail="Invalid market ID")

    market = await db.markets.find_one({"_id": ObjectId(market_id)})

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    return MarketResponse(
        id=str(market["_id"]),
        title=market["title"],
        description=market["description"],
        created_at=market["created_at"],
        resolution_date=market["resolution_date"],
        status=market["status"],
        resolved_outcome=market.get("resolved_outcome"),
        current_yes_price=market.get("current_yes_price", 0.5),
        current_no_price=market.get("current_no_price", 0.5),
        total_volume=market.get("total_volume", 0.0),
        is_private=market.get("is_private", False),
        invite_code=market.get("invite_code")
    )


@router.get("/{market_id}/orderbook", response_model=OrderbookResponse)
async def get_orderbook(market_id: str):
    """Get current orderbook for a market"""
    from app.services.orderbook import get_orderbook_snapshot

    if not ObjectId.is_valid(market_id):
        raise HTTPException(status_code=400, detail="Invalid market ID")

    db = await get_database()
    market = await db.markets.find_one({"_id": ObjectId(market_id)})

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    orderbook = await get_orderbook_snapshot(ObjectId(market_id))
    return orderbook


@router.post("", response_model=MarketResponse)
async def create_market(
    market_data: MarketCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create a new market (admin only)"""
    db = await get_database()

    market_dict = {
        "title": market_data.title,
        "description": market_data.description,
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow(),
        "resolution_date": market_data.resolution_date,
        "status": "active",
        "resolved_outcome": None,
        "current_yes_price": 0.5,
        "current_no_price": 0.5,
        "total_volume": 0.0
    }

    result = await db.markets.insert_one(market_dict)

    return MarketResponse(
        id=str(result.inserted_id),
        title=market_data.title,
        description=market_data.description,
        created_at=market_dict["created_at"],
        resolution_date=market_data.resolution_date,
        status="active",
        resolved_outcome=None,
        current_yes_price=0.5,
        current_no_price=0.5,
        total_volume=0.0
    )


@router.post("/{market_id}/resolve")
async def resolve_market(
    market_id: str,
    resolution: MarketResolve,
    current_user: dict = Depends(get_current_admin)
):
    """Resolve a market and payout winners (admin only)"""
    db = await get_database()

    if not ObjectId.is_valid(market_id):
        raise HTTPException(status_code=400, detail="Invalid market ID")

    market_obj_id = ObjectId(market_id)
    market = await db.markets.find_one({"_id": market_obj_id})

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    if market["status"] == "resolved":
        raise HTTPException(status_code=400, detail="Market already resolved")

    # Update market status
    await db.markets.update_one(
        {"_id": market_obj_id},
        {
            "$set": {
                "status": "resolved",
                "resolved_outcome": resolution.outcome
            }
        }
    )

    # Payout winners
    positions_cursor = db.positions.find({"market_id": market_obj_id})

    async for position in positions_cursor:
        user_id = position["user_id"]

        # Calculate payout
        if resolution.outcome == "YES":
            payout = position["yes_shares"] * 1.0  # Each YES share worth $1
        else:
            payout = position["no_shares"] * 1.0  # Each NO share worth $1

        # Credit user account
        if payout > 0:
            await db.users.update_one(
                {"_id": user_id},
                {"$inc": {"token_balance": payout}}
            )

    # Cancel all open orders for this market
    await db.orders.update_many(
        {
            "market_id": market_obj_id,
            "status": {"$in": ["OPEN", "PARTIAL"]}
        },
        {"$set": {"status": "CANCELLED"}}
    )

    return {"message": f"Market resolved as {resolution.outcome}"}


@router.delete("/{market_id}")
async def delete_market(
    market_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Delete a market and refund all users (admin only)"""
    db = await get_database()

    if not ObjectId.is_valid(market_id):
        raise HTTPException(status_code=400, detail="Invalid market ID")

    market_obj_id = ObjectId(market_id)
    market = await db.markets.find_one({"_id": market_obj_id})

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    total_refunded = 0.0
    users_refunded = 0

    # Refund all positions - return tokens based on what users paid
    positions_cursor = db.positions.find({"market_id": market_obj_id})
    async for position in positions_cursor:
        user_id = position["user_id"]

        # Calculate refund based on average prices paid
        yes_refund = position.get("yes_shares", 0) * position.get("avg_yes_price", 0.5)
        no_refund = position.get("no_shares", 0) * position.get("avg_no_price", 0.5)
        refund = yes_refund + no_refund

        if refund > 0:
            await db.users.update_one(
                {"_id": user_id},
                {"$inc": {"token_balance": refund}}
            )
            total_refunded += refund
            users_refunded += 1

    # Refund open/partial orders (tokens that are locked)
    orders_cursor = db.orders.find({
        "market_id": market_obj_id,
        "status": {"$in": ["OPEN", "PARTIAL"]},
        "order_type": "BUY"
    })
    async for order in orders_cursor:
        # Refund unfilled portion of buy orders
        unfilled = order["quantity"] - order.get("filled_quantity", 0)
        refund = unfilled * order["price"]
        if refund > 0:
            await db.users.update_one(
                {"_id": order["user_id"]},
                {"$inc": {"token_balance": refund}}
            )
            total_refunded += refund

    # Delete all related data
    await db.positions.delete_many({"market_id": market_obj_id})
    await db.orders.delete_many({"market_id": market_obj_id})
    await db.trades.delete_many({"market_id": market_obj_id})
    await db.markets.delete_one({"_id": market_obj_id})

    return {
        "message": f"Market deleted successfully. Refunded ${total_refunded:.2f} to {users_refunded} users."
    }
# Private Markets Endpoints

@router.post("/private", response_model=MarketResponse)
async def create_private_market(
    market_data: PrivateMarketCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a private market with custom settings (any user can create)"""
    import secrets
    db = await get_database()

    # Generate unique invite code
    invite_code = secrets.token_urlsafe(16)

    market_dict = {
        "title": market_data.title,
        "description": market_data.description,
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow(),
        "resolution_date": market_data.resolution_date,
        "status": "active",
        "resolved_outcome": None,
        "current_yes_price": 0.5,
        "current_no_price": 0.5,
        "total_volume": 0.0,
        "is_private": True,
        "invite_code": invite_code,
        "initial_token_balance": market_data.initial_token_balance,
        "participants": [current_user["_id"]]  # Creator is first participant
    }

    result = await db.markets.insert_one(market_dict)

    return MarketResponse(
        id=str(result.inserted_id),
        title=market_data.title,
        description=market_data.description,
        created_at=market_dict["created_at"],
        resolution_date=market_data.resolution_date,
        status="active",
        resolved_outcome=None,
        current_yes_price=0.5,
        current_no_price=0.5,
        total_volume=0.0,
        is_private=True,
        invite_code=invite_code
    )


@router.post("/join/{invite_code}", response_model=MarketResponse)
async def join_private_market(
    invite_code: str,
    current_user: dict = Depends(get_current_user)
):
    """Join a private market using an invite code"""
    db = await get_database()

    market = await db.markets.find_one({"invite_code": invite_code, "is_private": True})

    if not market:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    # Add user to participants if not already there
    if current_user["_id"] not in market.get("participants", []):
        await db.markets.update_one(
            {"_id": market["_id"]},
            {"$addToSet": {"participants": current_user["_id"]}}
        )

        # Give user initial tokens for this private market (create separate balance tracking)
        initial_balance = market.get("initial_token_balance", 1000)
        await db.private_balances.update_one(
            {"user_id": current_user["_id"], "market_id": market["_id"]},
            {"$setOnInsert": {"balance": initial_balance}},
            upsert=True
        )

    return MarketResponse(
        id=str(market["_id"]),
        title=market["title"],
        description=market["description"],
        created_at=market["created_at"],
        resolution_date=market["resolution_date"],
        status=market["status"],
        resolved_outcome=market.get("resolved_outcome"),
        current_yes_price=market.get("current_yes_price", 0.5),
        current_no_price=market.get("current_no_price", 0.5),
        total_volume=market.get("total_volume", 0.0),
        is_private=True,
        invite_code=market["invite_code"]
    )


@router.get("/private/my-markets", response_model=List[MarketResponse])
async def get_my_private_markets(current_user: dict = Depends(get_current_user)):
    """Get all private markets the current user has access to"""
    db = await get_database()

    markets_cursor = db.markets.find({
        "is_private": True,
        "participants": current_user["_id"]
    }).sort("created_at", -1)

    markets = []
    async for market in markets_cursor:
        markets.append(MarketResponse(
            id=str(market["_id"]),
            title=market["title"],
            description=market["description"],
            created_at=market["created_at"],
            resolution_date=market["resolution_date"],
            status=market["status"],
            resolved_outcome=market.get("resolved_outcome"),
            current_yes_price=market.get("current_yes_price", 0.5),
            current_no_price=market.get("current_no_price", 0.5),
            total_volume=market.get("total_volume", 0.0),
            is_private=True,
            invite_code=market.get("invite_code")
        ))

    return markets
