from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId
from datetime import datetime

from app.models import MarketCreate, MarketResponse, MarketResolve, OrderbookResponse
from app.auth import get_current_user, get_current_admin
from app.database import get_database

router = APIRouter(prefix="/api/markets", tags=["markets"])


@router.get("", response_model=List[MarketResponse])
async def list_markets(status_filter: str = "active"):
    """List all markets"""
    db = await get_database()

    query = {}
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
            total_volume=market.get("total_volume", 0.0)
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
        total_volume=market.get("total_volume", 0.0)
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
