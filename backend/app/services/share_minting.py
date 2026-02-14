from bson import ObjectId
from datetime import datetime
from typing import Optional, Tuple


async def attempt_share_minting(
    db,
    market_id: ObjectId,
    new_order: dict,
    sio
) -> Tuple[int, list]:
    """
    Attempt to mint shares by matching opposing BUY orders whose prices sum to $1.

    Returns: (filled_quantity, list of trade records)
    """
    if new_order["order_type"] != "BUY":
        return 0, []

    # Find opposing side BUY orders
    opposite_side = "NO" if new_order["side"] == "YES" else "YES"
    target_price = 1.0 - new_order["price"]

    # Find matching opposite buy orders
    opposite_orders = await db.orders.find({
        "market_id": market_id,
        "side": opposite_side,
        "order_type": "BUY",
        "price": target_price,
        "status": {"$in": ["OPEN", "PARTIAL"]},
        "_id": {"$ne": new_order["_id"]}  # Don't match with self
    }).sort("created_at", 1).to_list(length=100)

    total_filled = 0
    trades = []
    remaining_quantity = new_order["quantity"] - new_order.get("filled_quantity", 0)

    for opp_order in opposite_orders:
        if remaining_quantity <= 0:
            break

        # Calculate how many shares can be minted
        opp_remaining = opp_order["quantity"] - opp_order.get("filled_quantity", 0)
        mint_quantity = min(remaining_quantity, opp_remaining)

        if mint_quantity <= 0:
            continue

        # Calculate costs
        new_order_cost = new_order["price"] * mint_quantity
        opp_order_cost = opp_order["price"] * mint_quantity

        # Check if both users have sufficient balance
        new_order_user = await db.users.find_one({"_id": new_order["user_id"]})
        opp_order_user = await db.users.find_one({"_id": opp_order["user_id"]})

        if not new_order_user or not opp_order_user:
            continue

        if new_order_user["token_balance"] < new_order_cost:
            continue
        if opp_order_user["token_balance"] < opp_order_cost:
            continue

        # MINT SHARES: Deduct tokens and credit shares
        # Deduct from new order user
        await db.users.update_one(
            {"_id": new_order["user_id"]},
            {"$inc": {"token_balance": -new_order_cost}}
        )

        # Deduct from opposite order user
        await db.users.update_one(
            {"_id": opp_order["user_id"]},
            {"$inc": {"token_balance": -opp_order_cost}}
        )

        # Update or create positions for new order user
        await update_position(
            db,
            new_order["user_id"],
            market_id,
            new_order["side"],
            mint_quantity,
            new_order["price"]
        )

        # Update or create positions for opposite order user
        await update_position(
            db,
            opp_order["user_id"],
            market_id,
            opp_order["side"],
            mint_quantity,
            opp_order["price"]
        )

        # Update order filled quantities
        new_filled = new_order.get("filled_quantity", 0) + mint_quantity
        await db.orders.update_one(
            {"_id": new_order["_id"]},
            {
                "$set": {
                    "filled_quantity": new_filled,
                    "status": "FILLED" if new_filled >= new_order["quantity"] else "PARTIAL"
                }
            }
        )
        new_order["filled_quantity"] = new_filled

        opp_filled = opp_order.get("filled_quantity", 0) + mint_quantity
        await db.orders.update_one(
            {"_id": opp_order["_id"]},
            {
                "$set": {
                    "filled_quantity": opp_filled,
                    "status": "FILLED" if opp_filled >= opp_order["quantity"] else "PARTIAL"
                }
            }
        )

        # Create trade record (minting event)
        trade = {
            "market_id": market_id,
            "buy_order_id": new_order["_id"],
            "sell_order_id": opp_order["_id"],  # In minting, both are buy orders
            "buyer_id": new_order["user_id"],
            "seller_id": opp_order["user_id"],
            "side": new_order["side"],
            "price": new_order["price"],
            "quantity": mint_quantity,
            "executed_at": datetime.utcnow(),
            "trade_type": "MINT"  # Mark as share minting
        }
        result = await db.trades.insert_one(trade)
        trade["_id"] = result.inserted_id
        trades.append(trade)

        # Update market volume - for minting, both sides cost $1 total per share
        trade_volume = 1.0 * mint_quantity  # YES + NO prices always sum to $1
        await db.markets.update_one(
            {"_id": market_id},
            {"$inc": {"total_volume": trade_volume}}
        )

        # Update totals
        total_filled += mint_quantity
        remaining_quantity -= mint_quantity

        # Emit WebSocket event for trade
        if sio:
            await sio.emit('trade_executed', {
                'market_id': str(market_id),
                'side': new_order["side"],
                'price': new_order["price"],
                'quantity': mint_quantity,
                'timestamp': datetime.utcnow().isoformat(),
                'trade_type': 'MINT'
            })

    return total_filled, trades


async def update_position(db, user_id: ObjectId, market_id: ObjectId, side: str, quantity: int, price: float):
    """Update or create a user's position in a market"""
    position = await db.positions.find_one({
        "user_id": user_id,
        "market_id": market_id
    })

    if position:
        # Update existing position
        if side == "YES":
            old_shares = position["yes_shares"]
            old_avg_price = position["avg_yes_price"]
            new_shares = old_shares + quantity
            new_avg_price = ((old_shares * old_avg_price) + (quantity * price)) / new_shares if new_shares > 0 else 0

            await db.positions.update_one(
                {"_id": position["_id"]},
                {
                    "$set": {
                        "yes_shares": new_shares,
                        "avg_yes_price": new_avg_price
                    }
                }
            )
        else:  # NO
            old_shares = position["no_shares"]
            old_avg_price = position["avg_no_price"]
            new_shares = old_shares + quantity
            new_avg_price = ((old_shares * old_avg_price) + (quantity * price)) / new_shares if new_shares > 0 else 0

            await db.positions.update_one(
                {"_id": position["_id"]},
                {
                    "$set": {
                        "no_shares": new_shares,
                        "avg_no_price": new_avg_price
                    }
                }
            )
    else:
        # Create new position
        new_position = {
            "user_id": user_id,
            "market_id": market_id,
            "yes_shares": quantity if side == "YES" else 0,
            "no_shares": quantity if side == "NO" else 0,
            "avg_yes_price": price if side == "YES" else 0.0,
            "avg_no_price": price if side == "NO" else 0.0
        }
        await db.positions.insert_one(new_position)
