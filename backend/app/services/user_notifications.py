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
