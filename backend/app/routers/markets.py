from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId
from datetime import datetime

from app.models import MarketCreate, MarketResponse, MarketResolve, OrderbookResponse, MarketCommentCreate, MarketCommentResponse
from app.auth import get_current_user, get_current_admin, get_optional_user
from app.database import get_database
from app.services.market_quotes import best_quotes_for_market
from app.services.user_notifications import notify_market_resolved, notify_order_cancelled_on_resolve

router = APIRouter(prefix="/api/markets", tags=["markets"])


@router.get("", response_model=List[MarketResponse])
async def list_markets(status_filter: str = "active"):
    """List all PUBLIC markets (organization markets not included)"""
    db = await get_database()

    query = {
        "organization_id": {"$exists": False}  # Only public markets (no organization)
    }
    if status_filter:
        query["status"] = status_filter

    markets_cursor = db.markets.find(query).sort("created_at", -1)
    markets = []

    async for market in markets_cursor:
        yb, ya, nb, na = await best_quotes_for_market(market["_id"], market["status"])
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
            organization_id=str(market["organization_id"]) if market.get("organization_id") else None,
            yes_best_bid=yb,
            yes_best_ask=ya,
            no_best_bid=nb,
            no_best_ask=na,
        ))

    return markets


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


@router.get("/{market_id}/price-history")
async def get_price_history(market_id: str, limit: int = 500):
    """Get price history for a market"""
    if not ObjectId.is_valid(market_id):
        raise HTTPException(status_code=400, detail="Invalid market ID")

    db = await get_database()
    market = await db.markets.find_one({"_id": ObjectId(market_id)})

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    market_obj_id = ObjectId(market_id)

    # Get price history from the price_history collection
    history_cursor = db.price_history.find(
        {"market_id": market_obj_id}
    ).sort("timestamp", 1).limit(limit)

    price_history = []

    async for entry in history_cursor:
        price_history.append({
            "timestamp": entry["timestamp"].isoformat(),
            "yes_price": entry["yes_price"],
            "no_price": entry["no_price"],
            "source": entry.get("source", "unknown")
        })

    # If no price history exists, add the initial price point
    if not price_history:
        price_history.append({
            "timestamp": market["created_at"].isoformat(),
            "yes_price": 0.5,
            "no_price": 0.5,
            "source": "initial"
        })

    return {
        "market_id": market_id,
        "price_history": price_history,
        "current_yes_price": market.get("current_yes_price", 0.5),
        "current_no_price": market.get("current_no_price", 0.5)
    }


@router.get("/{market_id}", response_model=MarketResponse)
async def get_market(market_id: str):
    """Get market details"""
    db = await get_database()

    if not ObjectId.is_valid(market_id):
        raise HTTPException(status_code=400, detail="Invalid market ID")

    market = await db.markets.find_one({"_id": ObjectId(market_id)})

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    yb, ya, nb, na = await best_quotes_for_market(market["_id"], market["status"])
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
        organization_id=str(market["organization_id"]) if market.get("organization_id") else None,
        yes_best_bid=yb,
        yes_best_ask=ya,
        no_best_bid=nb,
        no_best_ask=na,
    )


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

    # Store initial price history entry
    await db.price_history.insert_one({
        "market_id": result.inserted_id,
        "yes_price": 0.5,
        "no_price": 0.5,
        "source": "initial",
        "timestamp": market_dict["created_at"]
    })

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
        yes_best_bid=None,
        yes_best_ask=None,
        no_best_bid=None,
        no_best_ask=None,
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

        # Credit user account and notify
        if payout > 0:
            await db.users.update_one(
                {"_id": user_id},
                {"$inc": {"token_balance": payout}}
            )
            await notify_market_resolved(
                db,
                user_id,
                market_title=market["title"],
                outcome=resolution.outcome,
                payout=payout,
            )

    # Release held tokens and notify users about cancelled limit orders
    open_buy_orders = await db.orders.find({
        "market_id": market_obj_id,
        "order_type": "BUY",
        "status": {"$in": ["OPEN", "PARTIAL"]},
        "tokens_held": True
    }).to_list(length=10000)

    for buy_order in open_buy_orders:
        unfilled = buy_order["quantity"] - buy_order.get("filled_quantity", 0)
        if unfilled > 0:
            refund = buy_order["price"] * unfilled
            await db.users.update_one(
                {"_id": buy_order["user_id"]},
                {"$inc": {"held_balance": -refund}}
            )
            await notify_order_cancelled_on_resolve(
                db,
                buy_order["user_id"],
                market_title=market["title"],
                side=buy_order["side"],
                outcome=resolution.outcome,
                refunded_tokens=refund,
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


@router.get("/{market_id}/comments", response_model=List[MarketCommentResponse])
async def get_market_comments(
    market_id: str,
    current_user: dict = Depends(get_optional_user),
):
    """Get all comments for a market (public)"""
    if not ObjectId.is_valid(market_id):
        raise HTTPException(status_code=400, detail="Invalid market ID")

    db = await get_database()
    if not await db.markets.find_one({"_id": ObjectId(market_id)}):
        raise HTTPException(status_code=404, detail="Market not found")

    user_id = current_user["_id"] if current_user else None
    comments = []
    async for c in db.market_comments.find({"market_id": ObjectId(market_id)}).sort("created_at", 1):
        likes = c.get("likes", [])
        comments.append(MarketCommentResponse(
            id=str(c["_id"]),
            user_id=str(c["user_id"]),
            user_name=c["user_name"],
            user_side=c["user_side"],
            text=c["text"],
            created_at=c["created_at"],
            reply_to_id=str(c["reply_to_id"]) if c.get("reply_to_id") else None,
            like_count=len(likes),
            liked_by_user=user_id in likes if user_id else False,
        ))
    return comments


@router.post("/{market_id}/comments", response_model=MarketCommentResponse)
async def post_market_comment(
    market_id: str,
    comment_data: MarketCommentCreate,
    current_user: dict = Depends(get_current_user),
):
    """Post a comment on a market (requires holding a position)"""
    if not ObjectId.is_valid(market_id):
        raise HTTPException(status_code=400, detail="Invalid market ID")

    text = comment_data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    db = await get_database()
    if not await db.markets.find_one({"_id": ObjectId(market_id)}):
        raise HTTPException(status_code=404, detail="Market not found")

    reply_to_id = None
    if comment_data.reply_to_id:
        if not ObjectId.is_valid(comment_data.reply_to_id):
            raise HTTPException(status_code=400, detail="Invalid reply_to_id")
        reply_to_id = ObjectId(comment_data.reply_to_id)

    position = await db.positions.find_one({
        "market_id": ObjectId(market_id),
        "user_id": current_user["_id"],
    })
    yes_shares = position.get("yes_shares", 0) if position else 0
    no_shares = position.get("no_shares", 0) if position else 0
    if yes_shares == 0 and no_shares == 0:
        raise HTTPException(status_code=403, detail="You must hold a position in this market to comment")

    user_side = "YES" if yes_shares >= no_shares else "NO"

    doc = {
        "market_id": ObjectId(market_id),
        "user_id": current_user["_id"],
        "user_name": current_user["name"],
        "user_side": user_side,
        "text": text,
        "created_at": datetime.utcnow(),
        "reply_to_id": reply_to_id,
        "likes": [],
    }
    result = await db.market_comments.insert_one(doc)

    return MarketCommentResponse(
        id=str(result.inserted_id),
        user_id=str(current_user["_id"]),
        user_name=current_user["name"],
        user_side=user_side,
        text=text,
        created_at=doc["created_at"],
        reply_to_id=comment_data.reply_to_id,
        like_count=0,
        liked_by_user=False,
    )


@router.post("/{market_id}/comments/{comment_id}/like")
async def toggle_market_comment_like(
    market_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Toggle like on a market comment"""
    if not ObjectId.is_valid(market_id) or not ObjectId.is_valid(comment_id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    db = await get_database()
    comment = await db.market_comments.find_one({
        "_id": ObjectId(comment_id),
        "market_id": ObjectId(market_id),
    })
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    user_id = current_user["_id"]
    likes = comment.get("likes", [])
    if user_id in likes:
        await db.market_comments.update_one(
            {"_id": ObjectId(comment_id)},
            {"$pull": {"likes": user_id}},
        )
        return {"liked": False, "like_count": len(likes) - 1}
    else:
        await db.market_comments.update_one(
            {"_id": ObjectId(comment_id)},
            {"$push": {"likes": user_id}},
        )
        return {"liked": True, "like_count": len(likes) + 1}
