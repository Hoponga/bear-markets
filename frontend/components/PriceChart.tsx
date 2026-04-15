'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Price History</h3>

      {loading ? (
        <div className="h-[200px] sm:h-[300px] flex items-center justify-center text-text-disabled">
          <p>Loading price history...</p>
        </div>
      ) : formatData.length > 1 ? (
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
          <LineChart data={formatData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              interval={xAxisInterval}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickMargin={8}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis domain={[0, 100]} stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 11 }} width={35} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
            <Line type="monotone" dataKey="YES" stroke="#34d399" strokeWidth={2} dot={false} activeDot={false} />
            <Line type="monotone" dataKey="NO" stroke="#f87171" strokeWidth={2} dot={false} activeDot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] sm:h-[300px] flex items-center justify-center text-text-disabled text-center px-4">
          <p>No trades yet. Prices will appear as trades execute.</p>
        </div>
      )}
    </div>
  );
}
