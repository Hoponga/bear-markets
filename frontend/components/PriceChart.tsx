'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTradeUpdates, socketManager } from '@/lib/socket';

interface PriceChartProps {
  marketId: string;
}

interface PricePoint {
  timestamp: string;
  yes_price: number;
  no_price: number;
}

export default function PriceChart({ marketId }: PriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([
    { timestamp: new Date().toISOString(), yes_price: 0.5, no_price: 0.5 },
  ]);

  useEffect(() => {
    socketManager.connect();
    socketManager.subscribeMarket(marketId);

    const unsubscribe = useTradeUpdates(marketId, (trade) => {
      const newPoint: PricePoint = {
        timestamp: trade.timestamp,
        yes_price: trade.side === 'YES' ? trade.price : priceHistory[priceHistory.length - 1]?.yes_price || 0.5,
        no_price: trade.side === 'NO' ? trade.price : priceHistory[priceHistory.length - 1]?.no_price || 0.5,
      };

      setPriceHistory((prev) => [...prev.slice(-50), newPoint]); // Keep last 50 points
    });

    return () => {
      unsubscribe();
      socketManager.unsubscribeMarket(marketId);
    };
  }, [marketId]);

  const timeSpanMs = priceHistory.length > 1
    ? new Date(priceHistory[priceHistory.length - 1]!.timestamp).getTime() -
      new Date(priceHistory[0]!.timestamp).getTime()
    : 0;

  const formatData = priceHistory.map((point) => {
    const d = new Date(point.timestamp);
    const timeStr =
      timeSpanMs >= 24 * 60 * 60 * 1000
        ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : timeSpanMs >= 60 * 60 * 1000
          ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    return {
      time: timeStr,
      YES: (point.yes_price * 100).toFixed(1),
      NO: (point.no_price * 100).toFixed(1),
    };
  });

  const dataLength = formatData.length;
  const xAxisInterval = dataLength <= 6 ? 0 : Math.floor((dataLength - 1) / 5);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Price History</h3>

      {formatData.length > 1 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formatData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" interval={xAxisInterval} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="YES" stroke="#10b981" strokeWidth={2} dot={false} activeDot={false} />
            <Line type="monotone" dataKey="NO" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          <p>No trades yet. Prices will appear as trades execute.</p>
        </div>
      )}
    </div>
  );
}
