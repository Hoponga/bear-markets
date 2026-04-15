"""Insert in-app notifications for trading events."""

from datetime import datetime
from bson import ObjectId


async def notify_limit_order_matched(
    db,
    user_id: ObjectId,
    *,
    market_id: ObjectId,
    market_title: str,
    side: str,
    order_type: str,
    trade_quantity: int,
    price: float,
    resting_order_complete: bool,
) -> None:
    """Notify a user that their resting limit order was matched (fully or partially)."""
    action = "buy" if order_type == "BUY" else "sell"
    status = "filled" if resting_order_complete else "partially filled"
    message = (
        f'Your limit {action} order for {side} — {trade_quantity} share(s) at ${price:.2f} '
        f'on "{market_title}" was {status}.'
    )
    await db.notifications.insert_one(
        {
            "user_id": user_id,
            "message": message,
            "bet_id": None,
            "organization_id": None,
            "market_id": market_id,
            "read": False,
            "created_at": datetime.utcnow(),
        }
    )


async def notify_market_resolved(
    db,
    user_id,
    *,
    market_title: str,
    outcome: str,
    payout: float,
) -> None:
    """Notify a user that a market resolved and what they received."""
    if payout > 0:
        message = f'"{market_title}" resolved {outcome}. You received {payout:.2f} tokens.'
    else:
        message = f'"{market_title}" resolved {outcome}.'
    await db.notifications.insert_one({
        "user_id": user_id,
        "message": message,
        "bet_id": None,
        "organization_id": None,
        "read": False,
        "created_at": datetime.utcnow(),
    })


async def notify_order_cancelled_on_resolve(
    db,
    user_id,
    *,
    market_title: str,
    side: str,
    outcome: str,
    refunded_tokens: float,
) -> None:
    """Notify a user that their open limit order was cancelled due to market resolution."""
    message = (
        f'"{market_title}" resolved {outcome}. Your open {side} limit order was cancelled '
        f'and {refunded_tokens:.2f} tokens have been returned to your available balance.'
    )
    await db.notifications.insert_one({
        "user_id": user_id,
        "message": message,
        "bet_id": None,
        "organization_id": None,
        "read": False,
        "created_at": datetime.utcnow(),
    })
