'use client';

import { useState, useEffect } from 'react';
import { socketManager, useOrderbookUpdates } from '@/lib/socket';
import { marketsAPI } from '@/lib/api';
import type { Orderbook, OrderbookLevel } from '@/types';

interface OrderBookProps {
  marketId: string;
  side: 'YES' | 'NO';
}

export default function OrderBook({ marketId, side }: OrderBookProps) {
  const [orderbook, setOrderbook] = useState<Orderbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial orderbook
    marketsAPI.getOrderbook(marketId).then((data) => {
      setOrderbook(data);
      setLoading(false);
    });

    // Connect to WebSocket
    socketManager.connect();
    socketManager.subscribeMarket(marketId);

    // Subscribe to orderbook updates
    const unsubscribe = useOrderbookUpdates(marketId, (data) => {
      setOrderbook({
        YES: {
          bids: data.orderbook.YES.bids,
          asks: data.orderbook.YES.asks,
        },
        NO: {
          bids: data.orderbook.NO.bids,
          asks: data.orderbook.NO.asks,
        },
        midpoint_yes: data.midpoint.YES,
        midpoint_no: data.midpoint.NO,
      });
    });

    return () => {
      unsubscribe();
      socketManager.unsubscribeMarket(marketId);
    };
  }, [marketId]);

  if (loading || !orderbook) {
    return <div className="text-center py-8 text-gray-400">Loading orderbook...</div>;
  }

  const sideData = orderbook[side];
  const midpoint = side === 'YES' ? orderbook.midpoint_yes : orderbook.midpoint_no;

  const renderLevel = (level: OrderbookLevel, type: 'bid' | 'ask') => (
    <div
      key={`${type}-${level.price}`}
      className="grid grid-cols-2 py-2 px-3 hover:bg-gray-700/50"
    >
      <span className={`font-medium ${type === 'bid' ? 'text-green-400' : 'text-red-400'}`}>
        ${level.price.toFixed(2)}
      </span>
      <span className="text-gray-300 text-right">{level.quantity}</span>
    </div>
  );

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-white">
          {side} Orderbook
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Midpoint: <span className="font-medium text-white">${midpoint.toFixed(2)}</span>
        </p>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-2 py-2 px-3 bg-gray-700/50 border-b border-gray-700 text-xs font-medium text-gray-400">
        <span>Price</span>
        <span className="text-right">Quantity</span>
      </div>

      {/* Asks (Sell Orders) */}
      <div className="border-b border-gray-700">
        {sideData.asks.length > 0 ? (
          sideData.asks.slice(0, 10).map((level) => renderLevel(level, 'ask'))
        ) : (
          <div className="py-4 text-center text-sm text-gray-500">No sell orders</div>
        )}
      </div>

      {/* Spread */}
      <div className="bg-gray-700/30 py-2 px-3 text-center">
        <span className="text-xs text-gray-400">
          Spread:{' '}
          {sideData.asks[0] && sideData.bids[0]
            ? `$${(sideData.asks[0].price - sideData.bids[0].price).toFixed(3)}`
            : 'N/A'}
        </span>
      </div>

      {/* Bids (Buy Orders) */}
      <div>
        {sideData.bids.length > 0 ? (
          sideData.bids.slice(0, 10).map((level) => renderLevel(level, 'bid'))
        ) : (
          <div className="py-4 text-center text-sm text-gray-500">No buy orders</div>
        )}
      </div>
    </div>
  );
}
