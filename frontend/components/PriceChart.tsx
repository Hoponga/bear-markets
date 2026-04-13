'use client';

import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePriceUpdates, socketManager } from '@/lib/socket';
import { marketsAPI } from '@/lib/api';

interface PriceChartProps {
  marketId: string;
}

interface PricePoint {
  timestamp: string;
  yes_price: number;
  no_price: number;
}

export default function PriceChart({ marketId }: PriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const latestPricesRef = useRef({ yes_price: 0.5, no_price: 0.5 });

  // Fetch historical price data on mount
  useEffect(() => {
    const fetchPriceHistory = async () => {
      try {
        const data = await marketsAPI.getPriceHistory(marketId);
        const history = data.price_history.map(point => ({
          timestamp: point.timestamp,
          yes_price: point.yes_price,
          no_price: point.no_price,
        }));
        setPriceHistory(history);

        // Update latest prices reference
        if (history.length > 0) {
          const lastPoint = history[history.length - 1];
          latestPricesRef.current = {
            yes_price: lastPoint.yes_price,
            no_price: lastPoint.no_price,
          };
        }
      } catch (err) {
        console.error('Failed to fetch price history:', err);
        // Fallback to default starting point
        setPriceHistory([
          { timestamp: new Date().toISOString(), yes_price: 0.5, no_price: 0.5 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [marketId]);

  // Subscribe to real-time price updates
  useEffect(() => {
    socketManager.connect();
    socketManager.subscribeMarket(marketId);

    const unsubscribe = usePriceUpdates(marketId, (data) => {
      // Update reference
      latestPricesRef.current = { yes_price: data.yes_price, no_price: data.no_price };

      const newPoint: PricePoint = {
        timestamp: data.timestamp,
        yes_price: data.yes_price,
        no_price: data.no_price,
      };

      setPriceHistory((prev) => [...prev, newPoint]);
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
    <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Price History</h3>

      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-text-disabled">
          <p>Loading price history...</p>
        </div>
      ) : formatData.length > 1 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formatData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" interval={xAxisInterval} stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
            <YAxis domain={[0, 100]} stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend wrapperStyle={{ color: '#9ca3af' }} />
            <Line type="monotone" dataKey="YES" stroke="#34d399" strokeWidth={2} dot={false} activeDot={false} />
            <Line type="monotone" dataKey="NO" stroke="#f87171" strokeWidth={2} dot={false} activeDot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-text-disabled">
          <p>No trades yet. Prices will appear as trades execute.</p>
        </div>
      )}
    </div>
  );
}
