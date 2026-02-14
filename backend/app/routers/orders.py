from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId
from datetime import datetime

from app.models import OrderCreate, OrderResponse, MarketOrderCreate, MarketOrderResponse
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


@router.post("/market", response_model=MarketOrderResponse)
async def create_market_order(
    order_data: MarketOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Execute a market order that buys/sells until the token budget is exhausted.
    For BUY: Spends up to token_amount buying shares at best available prices.
    For SELL: Sells up to token_amount shares at best available prices.
    """
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

    if order_data.token_amount <= 0:
        raise HTTPException(status_code=400, detail="Token amount must be positive")

    user_id = current_user["_id"]

    if order_data.order_type == "BUY":
        return await execute_market_buy(
            db, market_id, user_id, order_data.side, order_data.token_amount, current_user
        )
    else:
        return await execute_market_sell(
            db, market_id, user_id, order_data.side, int(order_data.token_amount), current_user
        )


async def execute_market_buy(db, market_id, user_id, side, token_budget, current_user):
    """Execute a market buy order, spending up to token_budget"""

    # Verify user has enough tokens
    if current_user["token_balance"] < token_budget:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Need {token_budget} tokens, have {current_user['token_balance']}"
        )

    # Get available sell orders sorted by price (lowest first)
    sell_orders = await db.orders.find({
        "market_id": market_id,
        "side": side,
        "order_type": "SELL",
        "status": {"$in": ["OPEN", "PARTIAL"]}
    }).sort("price", 1).to_list(length=100)

    total_shares = 0
    total_spent = 0.0
    remaining_budget = token_budget

    for sell_order in sell_orders:
        if remaining_budget <= 0:
            break

        sell_remaining = sell_order["quantity"] - sell_order.get("filled_quantity", 0)
        if sell_remaining <= 0:
            continue

        price = sell_order["price"]

        # Calculate how many whole shares we can buy with remaining budget
        max_shares_affordable = int(remaining_budget / price)
        shares_to_buy = min(max_shares_affordable, sell_remaining)

        if shares_to_buy <= 0:
            break

        trade_cost = price * shares_to_buy

        # Execute the trade
        # Transfer tokens from buyer to seller
        await db.users.update_one(
            {"_id": user_id},
            {"$inc": {"token_balance": -trade_cost}}
        )
        await db.users.update_one(
            {"_id": sell_order["user_id"]},
            {"$inc": {"token_balance": trade_cost}}
        )

        # Transfer shares
        from app.services.orderbook import transfer_shares
        await transfer_shares(
            db,
            sell_order["user_id"],
            user_id,
            market_id,
            side,
            shares_to_buy,
            price
        )

        # Update sell order
        new_filled = sell_order.get("filled_quantity", 0) + shares_to_buy
        await db.orders.update_one(
            {"_id": sell_order["_id"]},
            {
                "$set": {
                    "filled_quantity": new_filled,
                    "status": "FILLED" if new_filled >= sell_order["quantity"] else "PARTIAL"
                }
            }
        )

        # Create trade record
        trade = {
            "market_id": market_id,
            "buy_order_id": None,  # Market order, no limit order
            "sell_order_id": sell_order["_id"],
            "buyer_id": user_id,
            "seller_id": sell_order["user_id"],
            "side": side,
            "price": price,
            "quantity": shares_to_buy,
            "executed_at": datetime.utcnow(),
            "is_market_order": True
        }
        await db.trades.insert_one(trade)

        # Update market volume
        await db.markets.update_one(
            {"_id": market_id},
            {"$inc": {"total_volume": trade_cost}}
        )

        total_shares += shares_to_buy
        total_spent += trade_cost
        remaining_budget -= trade_cost

        # Emit trade event
        if sio:
            await sio.emit('trade_executed', {
                'market_id': str(market_id),
                'side': side,
                'price': price,
                'quantity': shares_to_buy,
                'timestamp': datetime.utcnow().isoformat()
            })

    # If we haven't spent all budget and there are no more sells, try share minting
    if remaining_budget > 0 and total_shares == 0:
        # Try to mint at market price (midpoint)
        orderbook = await get_orderbook_snapshot(market_id)
        mint_price = orderbook.midpoint_yes if side == "YES" else orderbook.midpoint_no

        if mint_price > 0 and mint_price < 1:
            max_shares = int(remaining_budget / mint_price)
            if max_shares > 0:
                # Create a limit order at market price to trigger minting
                order_dict = {
                    "market_id": market_id,
                    "user_id": user_id,
                    "side": side,
                    "order_type": "BUY",
                    "price": min(mint_price + 0.01, 0.99),  # Slightly above to ensure fill
                    "quantity": max_shares,
                    "filled_quantity": 0,
                    "status": "OPEN",
                    "created_at": datetime.utcnow()
                }
                result = await db.orders.insert_one(order_dict)
                order_dict["_id"] = result.inserted_id

                # Try share minting
                minted, _ = await attempt_share_minting(db, market_id, order_dict, sio)

                if minted > 0:
                    # Get updated order
                    updated_order = await db.orders.find_one({"_id": result.inserted_id})
                    total_shares += minted
                    total_spent += minted * order_dict["price"]

                # Cancel any remaining unfilled portion
                await db.orders.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {"status": "CANCELLED" if updated_order["filled_quantity"] == 0 else "PARTIAL"}}
                )

    # Update orderbook snapshot
    if sio and total_shares > 0:
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

        await db.markets.update_one(
            {"_id": market_id},
            {
                "$set": {
                    "current_yes_price": orderbook.midpoint_yes,
                    "current_no_price": orderbook.midpoint_no
                }
            }
        )

    avg_price = total_spent / total_shares if total_shares > 0 else 0

    return MarketOrderResponse(
        shares_filled=total_shares,
        tokens_spent=round(total_spent, 2),
        average_price=round(avg_price, 4),
        message=f"Bought {total_shares} {side} shares for ${total_spent:.2f}" if total_shares > 0 else "No shares available at current prices"
    )


async def execute_market_sell(db, market_id, user_id, side, shares_to_sell, current_user):
    """Execute a market sell order, selling up to shares_to_sell shares"""

    # Verify user has enough shares
    position = await db.positions.find_one({
        "user_id": user_id,
        "market_id": market_id
    })

    if not position:
        raise HTTPException(
            status_code=400,
            detail=f"You don't have any {side} shares to sell"
        )

    shares_held = position["yes_shares"] if side == "YES" else position["no_shares"]
    if shares_held < shares_to_sell:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient {side} shares. You have {shares_held}, trying to sell {shares_to_sell}"
        )

    # Get available buy orders sorted by price (highest first)
    buy_orders = await db.orders.find({
        "market_id": market_id,
        "side": side,
        "order_type": "BUY",
        "status": {"$in": ["OPEN", "PARTIAL"]}
    }).sort("price", -1).to_list(length=100)

    total_shares_sold = 0
    total_received = 0.0
    remaining_shares = shares_to_sell

    for buy_order in buy_orders:
        if remaining_shares <= 0:
            break

        buy_remaining = buy_order["quantity"] - buy_order.get("filled_quantity", 0)
        if buy_remaining <= 0:
            continue

        price = buy_order["price"]
        shares_to_trade = min(remaining_shares, buy_remaining)

        if shares_to_trade <= 0:
            break

        trade_value = price * shares_to_trade

        # Verify buyer has sufficient funds
        buyer = await db.users.find_one({"_id": buy_order["user_id"]})
        if not buyer or buyer["token_balance"] < trade_value:
            continue

        # Execute the trade
        # Transfer tokens from buyer to seller
        await db.users.update_one(
            {"_id": buy_order["user_id"]},
            {"$inc": {"token_balance": -trade_value}}
        )
        await db.users.update_one(
            {"_id": user_id},
            {"$inc": {"token_balance": trade_value}}
        )

        # Transfer shares
        from app.services.orderbook import transfer_shares
        await transfer_shares(
            db,
            user_id,
            buy_order["user_id"],
            market_id,
            side,
            shares_to_trade,
            price
        )

        # Update buy order
        new_filled = buy_order.get("filled_quantity", 0) + shares_to_trade
        await db.orders.update_one(
            {"_id": buy_order["_id"]},
            {
                "$set": {
                    "filled_quantity": new_filled,
                    "status": "FILLED" if new_filled >= buy_order["quantity"] else "PARTIAL"
                }
            }
        )

        # Create trade record
        trade = {
            "market_id": market_id,
            "buy_order_id": buy_order["_id"],
            "sell_order_id": None,  # Market order, no limit order
            "buyer_id": buy_order["user_id"],
            "seller_id": user_id,
            "side": side,
            "price": price,
            "quantity": shares_to_trade,
            "executed_at": datetime.utcnow(),
            "is_market_order": True
        }
        await db.trades.insert_one(trade)

        # Update market volume
        await db.markets.update_one(
            {"_id": market_id},
            {"$inc": {"total_volume": trade_value}}
        )

        total_shares_sold += shares_to_trade
        total_received += trade_value
        remaining_shares -= shares_to_trade

        # Emit trade event
        if sio:
            await sio.emit('trade_executed', {
                'market_id': str(market_id),
                'side': side,
                'price': price,
                'quantity': shares_to_trade,
                'timestamp': datetime.utcnow().isoformat()
            })

    # Update orderbook snapshot
    if sio and total_shares_sold > 0:
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

        await db.markets.update_one(
            {"_id": market_id},
            {
                "$set": {
                    "current_yes_price": orderbook.midpoint_yes,
                    "current_no_price": orderbook.midpoint_no
                }
            }
        )

    avg_price = total_received / total_shares_sold if total_shares_sold > 0 else 0

    return MarketOrderResponse(
        shares_filled=total_shares_sold,
        tokens_spent=round(total_received, 2),  # For sell, this is tokens received
        average_price=round(avg_price, 4),
        message=f"Sold {total_shares_sold} {side} shares for ${total_received:.2f}" if total_shares_sold > 0 else "No buyers available at current prices"
    )
