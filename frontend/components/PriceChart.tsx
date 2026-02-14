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

  const formatData = priceHistory.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    YES: (point.yes_price * 100).toFixed(1),
    NO: (point.no_price * 100).toFixed(1),
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Price History</h3>

      {formatData.length > 1 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formatData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="YES" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="NO" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          <p>No trades yet. Prices will appear as trades execute.</p>
        </div>
      )}

      <div className="mt-4 flex justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">YES</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">NO</span>
        </div>
      </div>
    </div>
  );
}
