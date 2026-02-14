'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { marketsAPI } from '@/lib/api';
import OrderBook from '@/components/OrderBook';
import TradeInterface from '@/components/TradeInterface';
import PriceChart from '@/components/PriceChart';
import type { Market } from '@/types';

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMarket();
  }, [marketId]);

  const loadMarket = async () => {
    try {
      const data = await marketsAPI.get(marketId);
      setMarket(data);
    } catch (err: any) {
      setError('Failed to load market');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading market...</p>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error || 'Market not found'}</p>
        </div>
      </div>
    );
  }

  const yesPrice = (market.current_yes_price * 100).toFixed(1);
  const noPrice = (market.current_no_price * 100).toFixed(1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Market Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{market.title}</h1>
        <p className="text-gray-600 mb-6">{market.description}</p>

        {/* Current Prices */}
        <div className="grid grid-cols-2 gap-6 max-w-md">
          <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
            <p className="text-sm text-green-700 font-medium mb-1">YES</p>
            <p className="text-4xl font-bold text-green-600">{yesPrice}¢</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
            <p className="text-sm text-red-700 font-medium mb-1">NO</p>
            <p className="text-4xl font-bold text-red-600">{noPrice}¢</p>
          </div>
        </div>

        {/* Market Info */}
        <div className="mt-6 flex space-x-6 text-sm text-gray-500">
          <span>Volume: ${market.total_volume.toFixed(0)}</span>
          <span>
            Closes: {new Date(market.resolution_date).toLocaleDateString()}
          </span>
          <span className={market.status === 'active' ? 'text-green-600' : 'text-gray-600'}>
            {market.status === 'active' ? '● Active' : '○ Resolved'}
          </span>
        </div>
      </div>

      {/* Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left: YES Orderbook */}
        <div>
          <OrderBook marketId={marketId} side="YES" />
        </div>

        {/* Center: Trade Interface */}
        <div>
          <TradeInterface marketId={marketId} onOrderPlaced={loadMarket} />
        </div>

        {/* Right: NO Orderbook */}
        <div>
          <OrderBook marketId={marketId} side="NO" />
        </div>
      </div>

      {/* Price Chart */}
      <PriceChart marketId={marketId} />
    </div>
  );
}
