"""Best bid/ask from the orderbook for market API responses."""

from typing import Optional, Tuple

from bson import ObjectId

from app.services.orderbook import get_orderbook_snapshot, orderbook_top_of_book


async def best_quotes_for_market(
    market_id: ObjectId, status: str
) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
    """Return (yes_bid, yes_ask, no_bid, no_ask) or all None if not active."""
    if status != "active":
        return None, None, None, None
    ob = await get_orderbook_snapshot(market_id)
    top = orderbook_top_of_book(ob)
    return (
        top["yes_best_bid"],
        top["yes_best_ask"],
        top["no_best_bid"],
        top["no_best_ask"],
    )
