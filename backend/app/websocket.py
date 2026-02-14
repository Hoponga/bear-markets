import socketio
from bson import ObjectId

# Socket.IO server instance
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # In production, restrict this to your frontend domain
    logger=True,
    engineio_logger=True
)


@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    print(f"Client connected: {sid}")
    await sio.emit('connection_established', {'sid': sid}, room=sid)


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    print(f"Client disconnected: {sid}")


@sio.event
async def subscribe_market(sid, data):
    """Subscribe client to a specific market's updates"""
    market_id = data.get('market_id')
    if market_id:
        room_name = f"market_{market_id}"
        await sio.enter_room(sid, room_name)
        print(f"Client {sid} subscribed to market {market_id}")

        # Send current orderbook snapshot
        from app.services.orderbook import get_orderbook_snapshot
        try:
            orderbook = await get_orderbook_snapshot(ObjectId(market_id))
            await sio.emit('orderbook_update', {
                'market_id': market_id,
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
            }, room=sid)
        except Exception as e:
            print(f"Error sending orderbook snapshot: {e}")


@sio.event
async def unsubscribe_market(sid, data):
    """Unsubscribe client from a market's updates"""
    market_id = data.get('market_id')
    if market_id:
        room_name = f"market_{market_id}"
        await sio.leave_room(sid, room_name)
        print(f"Client {sid} unsubscribed from market {market_id}")


# Helper function to broadcast to market room
async def broadcast_to_market(market_id: str, event: str, data: dict):
    """Broadcast an event to all clients subscribed to a market"""
    room_name = f"market_{market_id}"
    await sio.emit(event, data, room=room_name)
