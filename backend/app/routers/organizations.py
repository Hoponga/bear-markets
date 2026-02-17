from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId
from datetime import datetime
import secrets

from app.models import (
    OrganizationCreate, OrganizationResponse, OrganizationMemberResponse,
    InviteUserRequest, OrganizationLeaderboardResponse, LeaderboardEntry,
    MarketCreate, MarketResponse
)
from app.auth import get_current_user
from app.database import get_database

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.post("", response_model=OrganizationResponse)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new organization"""
    db = await get_database()

    # Generate unique invite code
    invite_code = secrets.token_urlsafe(16)

    org_dict = {
        "name": org_data.name,
        "description": org_data.description,
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow(),
        "invite_code": invite_code,
        "initial_token_balance": org_data.initial_token_balance,
        "member_count": 1
    }

    result = await db.organizations.insert_one(org_dict)
    org_id = result.inserted_id

    # Add creator as first member with admin privileges
    member_dict = {
        "organization_id": org_id,
        "user_id": current_user["_id"],
        "token_balance": org_data.initial_token_balance,
        "joined_at": datetime.utcnow(),
        "is_admin": True
    }
    await db.organization_members.insert_one(member_dict)

    return OrganizationResponse(
        id=str(org_id),
        name=org_data.name,
        description=org_data.description,
        created_by=str(current_user["_id"]),
        created_at=org_dict["created_at"],
        member_count=1,
        invite_code=invite_code,
        initial_token_balance=org_data.initial_token_balance
    )


@router.get("", response_model=List[OrganizationResponse])
async def list_my_organizations(current_user: dict = Depends(get_current_user)):
    """Get all organizations the current user is a member of"""
    db = await get_database()

    # Find all memberships for this user
    memberships_cursor = db.organization_members.find({"user_id": current_user["_id"]})
    org_ids = [m["organization_id"] async for m in memberships_cursor]

    # Get organization details
    orgs_cursor = db.organizations.find({"_id": {"$in": org_ids}})
    organizations = []

    async for org in orgs_cursor:
        organizations.append(OrganizationResponse(
            id=str(org["_id"]),
            name=org["name"],
            description=org["description"],
            created_by=str(org["created_by"]),
            created_at=org["created_at"],
            member_count=org["member_count"],
            invite_code=org["invite_code"],
            initial_token_balance=org["initial_token_balance"]
        ))

    return organizations


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get organization details"""
    db = await get_database()

    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Verify user is a member
    member = await db.organization_members.find_one({
        "organization_id": ObjectId(org_id),
        "user_id": current_user["_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    return OrganizationResponse(
        id=str(org["_id"]),
        name=org["name"],
        description=org["description"],
        created_by=str(org["created_by"]),
        created_at=org["created_at"],
        member_count=org["member_count"],
        invite_code=org["invite_code"],
        initial_token_balance=org["initial_token_balance"]
    )


@router.post("/{org_id}/join/{invite_code}", response_model=OrganizationResponse)
async def join_organization(
    org_id: str,
    invite_code: str,
    current_user: dict = Depends(get_current_user)
):
    """Join an organization using invite code"""
    db = await get_database()

    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    org = await db.organizations.find_one({
        "_id": ObjectId(org_id),
        "invite_code": invite_code
    })

    if not org:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    # Check if already a member
    existing_member = await db.organization_members.find_one({
        "organization_id": ObjectId(org_id),
        "user_id": current_user["_id"]
    })

    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member")

    # Add user as member
    member_dict = {
        "organization_id": ObjectId(org_id),
        "user_id": current_user["_id"],
        "token_balance": org["initial_token_balance"],
        "joined_at": datetime.utcnow(),
        "is_admin": False
    }
    await db.organization_members.insert_one(member_dict)

    # Update member count
    await db.organizations.update_one(
        {"_id": ObjectId(org_id)},
        {"$inc": {"member_count": 1}}
    )

    org["member_count"] += 1

    return OrganizationResponse(
        id=str(org["_id"]),
        name=org["name"],
        description=org["description"],
        created_by=str(org["created_by"]),
        created_at=org["created_at"],
        member_count=org["member_count"],
        invite_code=org["invite_code"],
        initial_token_balance=org["initial_token_balance"]
    )


@router.get("/{org_id}/members", response_model=List[OrganizationMemberResponse])
async def get_organization_members(
    org_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all members of an organization"""
    db = await get_database()

    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    # Verify user is a member
    member = await db.organization_members.find_one({
        "organization_id": ObjectId(org_id),
        "user_id": current_user["_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    # Get all members
    members_cursor = db.organization_members.find({"organization_id": ObjectId(org_id)})
    members = []

    async for mem in members_cursor:
        user = await db.users.find_one({"_id": mem["user_id"]})
        if user:
            members.append(OrganizationMemberResponse(
                user_id=str(mem["user_id"]),
                user_name=user["name"],
                user_email=user["email"],
                token_balance=mem["token_balance"],
                joined_at=mem["joined_at"],
                is_admin=mem["is_admin"]
            ))

    return members


@router.get("/{org_id}/leaderboard", response_model=OrganizationLeaderboardResponse)
async def get_organization_leaderboard(
    org_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get leaderboard for an organization"""
    db = await get_database()

    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    # Verify user is a member
    member = await db.organization_members.find_one({
        "organization_id": ObjectId(org_id),
        "user_id": current_user["_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    org = await db.organizations.find_one({"_id": ObjectId(org_id)})

    # Get all members with their positions
    members_cursor = db.organization_members.find({"organization_id": ObjectId(org_id)})
    leaderboard_data = []

    async for mem in members_cursor:
        user = await db.users.find_one({"_id": mem["user_id"]})
        if not user:
            continue

        # Calculate position value from all markets in this organization
        position_value = 0.0
        positions_cursor = db.positions.find({"user_id": mem["user_id"]})

        async for pos in positions_cursor:
            # Check if this position's market belongs to this organization
            market = await db.markets.find_one({"_id": pos["market_id"]})
            if market and market.get("organization_id") == ObjectId(org_id):
                # Use current market prices to estimate position value
                position_value += (pos["yes_shares"] * market.get("current_yes_price", 0.5))
                position_value += (pos["no_shares"] * market.get("current_no_price", 0.5))

        total_value = mem["token_balance"] + position_value

        leaderboard_data.append({
            "user_id": str(mem["user_id"]),
            "name": user["name"],
            "email": user["email"],
            "token_balance": mem["token_balance"],
            "position_value": position_value,
            "total_value": total_value
        })

    # Sort by total value descending
    leaderboard_data.sort(key=lambda x: x["total_value"], reverse=True)

    # Add ranks
    entries = []
    for rank, data in enumerate(leaderboard_data, start=1):
        entries.append(LeaderboardEntry(
            rank=rank,
            **data
        ))

    return OrganizationLeaderboardResponse(
        entries=entries,
        organization_id=org_id,
        organization_name=org["name"]
    )


@router.post("/{org_id}/markets", response_model=MarketResponse)
async def create_organization_market(
    org_id: str,
    market_data: MarketCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a market within an organization (any member can create)"""
    db = await get_database()

    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    # Verify user is a member
    member = await db.organization_members.find_one({
        "organization_id": ObjectId(org_id),
        "user_id": current_user["_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    # Create market
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
        "organization_id": ObjectId(org_id)  # Link to organization
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
        organization_id=org_id
    )


@router.get("/{org_id}/markets", response_model=List[MarketResponse])
async def get_organization_markets(
    org_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all markets in an organization"""
    db = await get_database()

    if not ObjectId.is_valid(org_id):
        raise HTTPException(status_code=400, detail="Invalid organization ID")

    # Verify user is a member
    member = await db.organization_members.find_one({
        "organization_id": ObjectId(org_id),
        "user_id": current_user["_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    # Get markets
    markets_cursor = db.markets.find({
        "organization_id": ObjectId(org_id),
        "status": "active"
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
            organization_id=org_id
        ))

    return markets
