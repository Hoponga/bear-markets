from bson import ObjectId
from datetime import datetime
from typing import Optional
from collections import defaultdict

from app.models import OrderbookResponse, OrderbookSide, OrderbookLevel


async def match_orders(db, market_id: ObjectId, new_order: dict, sio) -> int:
    """
    Match a new order against existing orders in the orderbook.
    Returns the total quantity filled through matching.
    """
    if new_order["order_type"] == "BUY":
        return await match_buy_order(db, market_id, new_order, sio)
    else:
        return await match_sell_order(db, market_id, new_order, sio)


async def match_buy_order(db, market_id: ObjectId, buy_order: dict, sio) -> int:
    """Match a BUY order with existing SELL orders"""
    # Find matching SELL orders on the same side at or below the buy price
    matching_sells = await db.orders.find({
        "market_id": market_id,
        "side": buy_order["side"],
        "order_type": "SELL",
        "price": {"$lte": buy_order["price"]},
        "status": {"$in": ["OPEN", "PARTIAL"]}
    }).sort("price", 1).to_list(length=100)  # Sort by price ascending (best prices first)

    total_filled = 0
    remaining_quantity = buy_order["quantity"] - buy_order.get("filled_quantity", 0)

    for sell_order in matching_sells:
        if remaining_quantity <= 0:
            break

        sell_remaining = sell_order["quantity"] - sell_order.get("filled_quantity", 0)
        trade_quantity = min(remaining_quantity, sell_remaining)

        if trade_quantity <= 0:
            continue

        # Execute the trade at the sell order's price
        execution_price = sell_order["price"]
        trade_value = execution_price * trade_quantity

        # Verify buyer has sufficient funds
        buyer = await db.users.find_one({"_id": buy_order["user_id"]})
        if not buyer or buyer["token_balance"] < trade_value:
            continue

        # Transfer tokens from buyer to seller
        await db.users.update_one(
            {"_id": buy_order["user_id"]},
            {"$inc": {"token_balance": -trade_value}}
        )
        await db.users.update_one(
            {"_id": sell_order["user_id"]},
            {"$inc": {"token_balance": trade_value}}
        )

        # Transfer shares from seller to buyer
        await transfer_shares(
            db,
            sell_order["user_id"],
            buy_order["user_id"],
            market_id,
            buy_order["side"],
            trade_quantity,
            execution_price
        )

        # Update order statuses
        buy_filled = buy_order.get("filled_quantity", 0) + trade_quantity
        await db.orders.update_one(
            {"_id": buy_order["_id"]},
            {
                "$set": {
                    "filled_quantity": buy_filled,
                    "status": "FILLED" if buy_filled >= buy_order["quantity"] else "PARTIAL"
                }
            }
        )
        buy_order["filled_quantity"] = buy_filled

        sell_filled = sell_order.get("filled_quantity", 0) + trade_quantity
        await db.orders.update_one(
            {"_id": sell_order["_id"]},
            {
                "$set": {
                    "filled_quantity": sell_filled,
                    "status": "FILLED" if sell_filled >= sell_order["quantity"] else "PARTIAL"
                }
            }
        )

        # Create trade record
        trade = {
            "market_id": market_id,
            "buy_order_id": buy_order["_id"],
            "sell_order_id": sell_order["_id"],
            "buyer_id": buy_order["user_id"],
            "seller_id": sell_order["user_id"],
            "side": buy_order["side"],
            "price": execution_price,
            "quantity": trade_quantity,
            "executed_at": datetime.utcnow()
        }
        await db.trades.insert_one(trade)

        # Update market volume
        trade_volume = execution_price * trade_quantity
        await db.markets.update_one(
            {"_id": market_id},
            {"$inc": {"total_volume": trade_volume}}
        )

        total_filled += trade_quantity
        remaining_quantity -= trade_quantity

        # Emit WebSocket event
        if sio:
            await sio.emit('trade_executed', {
                'market_id': str(market_id),
                'side': buy_order["side"],
                'price': execution_price,
                'quantity': trade_quantity,
                'timestamp': datetime.utcnow().isoformat()
            })

    return total_filled


async def match_sell_order(db, market_id: ObjectId, sell_order: dict, sio) -> int:
    """Match a SELL order with existing BUY orders"""
    # Verify seller has the shares
    position = await db.positions.find_one({
        "user_id": sell_order["user_id"],
        "market_id": market_id
    })

    if not position:
        return 0

    shares_held = position["yes_shares"] if sell_order["side"] == "YES" else position["no_shares"]
    if shares_held < sell_order["quantity"]:
        # Not enough shares to sell
        return 0

    # Find matching BUY orders on the same side at or above the sell price
    matching_buys = await db.orders.find({
        "market_id": market_id,
        "side": sell_order["side"],
        "order_type": "BUY",
        "price": {"$gte": sell_order["price"]},
        "status": {"$in": ["OPEN", "PARTIAL"]}
    }).sort("price", -1).to_list(length=100)  # Sort by price descending (best prices first)

    total_filled = 0
    remaining_quantity = sell_order["quantity"] - sell_order.get("filled_quantity", 0)

    for buy_order in matching_buys:
        if remaining_quantity <= 0:
            break

        buy_remaining = buy_order["quantity"] - buy_order.get("filled_quantity", 0)
        trade_quantity = min(remaining_quantity, buy_remaining)

        if trade_quantity <= 0:
            continue

        # Execute the trade at the buy order's price
        execution_price = buy_order["price"]
        trade_value = execution_price * trade_quantity

        # Verify buyer has sufficient funds
        buyer = await db.users.find_one({"_id": buy_order["user_id"]})
        if not buyer or buyer["token_balance"] < trade_value:
            continue

        # Transfer tokens from buyer to seller
        await db.users.update_one(
            {"_id": buy_order["user_id"]},
            {"$inc": {"token_balance": -trade_value}}
        )
        await db.users.update_one(
            {"_id": sell_order["user_id"]},
            {"$inc": {"token_balance": trade_value}}
        )

        # Transfer shares from seller to buyer
        await transfer_shares(
            db,
            sell_order["user_id"],
            buy_order["user_id"],
            market_id,
            sell_order["side"],
            trade_quantity,
            execution_price
        )

        # Update order statuses
        sell_filled = sell_order.get("filled_quantity", 0) + trade_quantity
        await db.orders.update_one(
            {"_id": sell_order["_id"]},
            {
                "$set": {
                    "filled_quantity": sell_filled,
                    "status": "FILLED" if sell_filled >= sell_order["quantity"] else "PARTIAL"
                }
            }
        )
        sell_order["filled_quantity"] = sell_filled

        buy_filled = buy_order.get("filled_quantity", 0) + trade_quantity
        await db.orders.update_one(
            {"_id": buy_order["_id"]},
            {
                "$set": {
                    "filled_quantity": buy_filled,
                    "status": "FILLED" if buy_filled >= buy_order["quantity"] else "PARTIAL"
                }
            }
        )

        # Create trade record
        trade = {
            "market_id": market_id,
            "buy_order_id": buy_order["_id"],
            "sell_order_id": sell_order["_id"],
            "buyer_id": buy_order["user_id"],
            "seller_id": sell_order["user_id"],
            "side": sell_order["side"],
            "price": execution_price,
            "quantity": trade_quantity,
            "executed_at": datetime.utcnow()
        }
        await db.trades.insert_one(trade)

        # Update market volume
        trade_volume = execution_price * trade_quantity
        await db.markets.update_one(
            {"_id": market_id},
            {"$inc": {"total_volume": trade_volume}}
        )

        total_filled += trade_quantity
        remaining_quantity -= trade_quantity

        # Emit WebSocket event
        if sio:
            await sio.emit('trade_executed', {
                'market_id': str(market_id),
                'side': sell_order["side"],
                'price': execution_price,
                'quantity': trade_quantity,
                'timestamp': datetime.utcnow().isoformat()
            })

    return total_filled


async def transfer_shares(db, from_user_id: ObjectId, to_user_id: ObjectId, market_id: ObjectId, side: str, quantity: int, price: float):
    """Transfer shares from one user to another"""
    # Deduct from seller
    from_position = await db.positions.find_one({
        "user_id": from_user_id,
        "market_id": market_id
    })

    if from_position:
        if side == "YES":
            await db.positions.update_one(
                {"_id": from_position["_id"]},
                {"$inc": {"yes_shares": -quantity}}
            )
        else:
            await db.positions.update_one(
                {"_id": from_position["_id"]},
                {"$inc": {"no_shares": -quantity}}
            )

    # Add to buyer (use update_position from share_minting)
    from app.services.share_minting import update_position
    await update_position(db, to_user_id, market_id, side, quantity, price)


async def get_orderbook_snapshot(market_id: ObjectId) -> OrderbookResponse:
    """Get current orderbook snapshot for a market"""
    from app.database import get_database
    db = await get_database()

    # Get all open orders for this market
    orders = await db.orders.find({
        "market_id": market_id,
        "status": {"$in": ["OPEN", "PARTIAL"]}
    }).to_list(length=1000)

    # Organize orders by side and type
    orderbook = {
        "YES": {"bids": defaultdict(int), "asks": defaultdict(int)},
        "NO": {"bids": defaultdict(int), "asks": defaultdict(int)}
    }

    for order in orders:
        side = order["side"]
        remaining = order["quantity"] - order.get("filled_quantity", 0)

        if order["order_type"] == "BUY":
            orderbook[side]["bids"][order["price"]] += remaining
        else:
            orderbook[side]["asks"][order["price"]] += remaining

    # Convert to sorted lists
    def make_orderbook_side(bids_dict, asks_dict):
        bids = [OrderbookLevel(price=p, quantity=q) for p, q in sorted(bids_dict.items(), reverse=True)]
        asks = [OrderbookLevel(price=p, quantity=q) for p, q in sorted(asks_dict.items())]
        return OrderbookSide(bids=bids, asks=asks)

    yes_side = make_orderbook_side(orderbook["YES"]["bids"], orderbook["YES"]["asks"])
    no_side = make_orderbook_side(orderbook["NO"]["bids"], orderbook["NO"]["asks"])

    # Calculate midpoints
    yes_midpoint = calculate_midpoint(yes_side)
    no_midpoint = calculate_midpoint(no_side)

    return OrderbookResponse(
        YES=yes_side,
        NO=no_side,
        midpoint_yes=yes_midpoint,
        midpoint_no=no_midpoint
    )


def calculate_midpoint(side: OrderbookSide) -> float:
    """Calculate midpoint from best bid and ask"""
    best_bid = side.bids[0].price if side.bids else 0.0
    best_ask = side.asks[0].price if side.asks else 1.0

    if best_bid > 0 and best_ask < 1.0:
        return (best_bid + best_ask) / 2
    elif best_bid > 0:
        return best_bid
    elif best_ask < 1.0:
        return best_ask
    else:
        return 0.5
