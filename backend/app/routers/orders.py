from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId
from datetime import datetime

from app.models import OrderCreate, OrderResponse
from app.auth import get_current_user
from app.database import get_database
from app.services.orderbook import match_orders, get_orderbook_snapshot
from app.services.share_minting import attempt_share_minting

router = APIRouter(prefix="/api/orders", tags=["orders"])


# Global reference to Socket.IO server (will be set in main.py)
sio = None

def set_sio(socket_io):
    global sio
    sio = socket_io


@router.post("", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a limit order"""
    db = await get_database()

    # Validate market exists
    if not ObjectId.is_valid(order_data.market_id):
        raise HTTPException(status_code=400, detail="Invalid market ID")

    market_id = ObjectId(order_data.market_id)
    market = await db.markets.find_one({"_id": market_id})

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    if market["status"] != "active":
        raise HTTPException(status_code=400, detail="Market is not active")

    # Validate price
    if order_data.price <= 0 or order_data.price >= 1:
        raise HTTPException(status_code=400, detail="Price must be between 0 and 1")

    # Validate quantity
    if order_data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    user_id = current_user["_id"]

    # For SELL orders, verify user has shares
    if order_data.order_type == "SELL":
        position = await db.positions.find_one({
            "user_id": user_id,
            "market_id": market_id
        })

        if not position:
            raise HTTPException(
                status_code=400,
                detail=f"You don't have any {order_data.side} shares to sell"
            )

        shares_held = position["yes_shares"] if order_data.side == "YES" else position["no_shares"]

        if shares_held < order_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient {order_data.side} shares. You have {shares_held}, trying to sell {order_data.quantity}"
            )

    # For BUY orders, check if user has enough tokens (preliminary check)
    if order_data.order_type == "BUY":
        max_cost = order_data.price * order_data.quantity
        if current_user["token_balance"] < max_cost:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance. Need {max_cost} tokens, have {current_user['token_balance']}"
            )

    # Create the order
    order_dict = {
        "market_id": market_id,
        "user_id": user_id,
        "side": order_data.side,
        "order_type": order_data.order_type,
        "price": order_data.price,
        "quantity": order_data.quantity,
        "filled_quantity": 0,
        "status": "OPEN",
        "created_at": datetime.utcnow()
    }

    result = await db.orders.insert_one(order_dict)
    order_dict["_id"] = result.inserted_id

    # Try to match the order immediately
    # Step 1: For BUY orders, try share minting first
    if order_data.order_type == "BUY":
        minted_quantity, _ = await attempt_share_minting(db, market_id, order_dict, sio)
        if minted_quantity > 0:
            # Refresh order from DB
            order_dict = await db.orders.find_one({"_id": order_dict["_id"]})

    # Step 2: Try matching with existing orders
    matched_quantity = await match_orders(db, market_id, order_dict, sio)

    # Refresh order from DB to get latest state
    order_dict = await db.orders.find_one({"_id": result.inserted_id})

    # Emit orderbook update via WebSocket
    if sio:
        orderbook = await get_orderbook_snapshot(market_id)
        await sio.emit('orderbook_update', {
            'market_id': str(market_id),
            'orderbook': {
                'YES': {
                    'bids': [{'price': b.price, 'quantity': b.quantity} for b in orderbook.YES.bids],
                    'asks': [{'price': a.price, 'quantity': a.quantity} for a in orderbook.YES.asks]
                },
                'NO': {
                    'bids': [{'price': b.price, 'quantity': b.quantity} for b in orderbook.NO.bids],
                    'asks': [{'price': a.price, 'quantity': a.quantity} for a in orderbook.NO.asks]
                }
            },
            'midpoint': {
                'YES': orderbook.midpoint_yes,
                'NO': orderbook.midpoint_no
            }
        })

        # Update market prices
        await db.markets.update_one(
            {"_id": market_id},
            {
                "$set": {
                    "current_yes_price": orderbook.midpoint_yes,
                    "current_no_price": orderbook.midpoint_no
                }
            }
        )

    return OrderResponse(
        id=str(order_dict["_id"]),
        market_id=str(order_dict["market_id"]),
        user_id=str(order_dict["user_id"]),
        side=order_dict["side"],
        order_type=order_dict["order_type"],
        price=order_dict["price"],
        quantity=order_dict["quantity"],
        filled_quantity=order_dict["filled_quantity"],
        status=order_dict["status"],
        created_at=order_dict["created_at"]
    )


@router.get("/my-orders", response_model=List[OrderResponse])
async def get_my_orders(
    current_user: dict = Depends(get_current_user),
    status_filter: str = None
):
    """Get user's orders"""
    db = await get_database()
    user_id = current_user["_id"]

    query = {"user_id": user_id}
    if status_filter:
        query["status"] = status_filter

    orders_cursor = db.orders.find(query).sort("created_at", -1)
    orders = []

    async for order in orders_cursor:
        orders.append(OrderResponse(
            id=str(order["_id"]),
            market_id=str(order["market_id"]),
            user_id=str(order["user_id"]),
            side=order["side"],
            order_type=order["order_type"],
            price=order["price"],
            quantity=order["quantity"],
            filled_quantity=order["filled_quantity"],
            status=order["status"],
            created_at=order["created_at"]
        ))

    return orders


@router.delete("/{order_id}")
async def cancel_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel an open order"""
    db = await get_database()

    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order ID")

    order = await db.orders.find_one({"_id": ObjectId(order_id)})

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Verify ownership
    if order["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this order")

    # Can only cancel OPEN or PARTIAL orders
    if order["status"] not in ["OPEN", "PARTIAL"]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled")

    # Cancel the order
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "CANCELLED"}}
    )

    # Emit orderbook update
    if sio:
        orderbook = await get_orderbook_snapshot(order["market_id"])
        await sio.emit('orderbook_update', {
            'market_id': str(order["market_id"]),
            'orderbook': {
                'YES': {
                    'bids': [{'price': b.price, 'quantity': b.quantity} for b in orderbook.YES.bids],
                    'asks': [{'price': a.price, 'quantity': a.quantity} for a in orderbook.YES.asks]
                },
                'NO': {
                    'bids': [{'price': b.price, 'quantity': b.quantity} for b in orderbook.NO.bids],
                    'asks': [{'price': a.price, 'quantity': a.quantity} for a in orderbook.NO.asks]
                }
            },
            'midpoint': {
                'YES': orderbook.midpoint_yes,
                'NO': orderbook.midpoint_no
            }
        })

    return {"message": "Order cancelled successfully"}
