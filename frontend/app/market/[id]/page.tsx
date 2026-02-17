'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { marketsAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import OrderBook from '@/components/OrderBook';
import TradeInterface from '@/components/TradeInterface';
import PriceChart from '@/components/PriceChart';
import type { Market, User } from '@/types';

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadMarket();
    setUser(authStorage.getUser());
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
          <p className="mt-4 text-text-muted">Loading market...</p>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
          <p className="text-red-400">{error || 'Market not found'}</p>
        </div>
      </div>
    );
  }

  const yesPrice = (market.current_yes_price * 100).toFixed(1);
  const noPrice = (market.current_no_price * 100).toFixed(1);
  const isAdmin = user?.is_admin ?? false;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
      : day === 2 || day === 22 ? 'nd'
      : day === 3 || day === 23 ? 'rd' : 'th';
    return `${month} ${day}${suffix}, ${year}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Market Overview & Price History */}
        <div className="lg:col-span-2">
          {/* Market Overview */}
          <h1 className="text-3xl font-bold text-text-primary mb-4">{market.title}</h1>
          <p className="text-text-muted mb-6">{market.description}</p>

          {/* Current Prices - Keep green/red */}
          <div className="grid grid-cols-2 gap-6 max-w-md mb-6">
            <div className="bg-green-900/30 rounded-lg p-4 border-2 border-green-700/50">
              <p className="text-sm text-green-400 font-medium mb-1">YES</p>
              <p className="text-4xl font-bold text-green-400">{yesPrice}¢</p>
            </div>
            <div className="bg-red-900/30 rounded-lg p-4 border-2 border-red-700/50">
              <p className="text-sm text-red-400 font-medium mb-1">NO</p>
              <p className="text-4xl font-bold text-red-400">{noPrice}¢</p>
            </div>
          </div>

          {/* Market Info */}
          <div className="flex space-x-6 text-sm text-text-disabled mb-8">
            <span>Volume: ${market.total_volume.toFixed(0)}</span>
            <span>Closes: {formatDate(market.resolution_date)}</span>
            <span className={market.status === 'active' ? 'text-green-400' : 'text-text-disabled'}>
              {market.status === 'active' ? '● Active' : '○ Resolved'}
            </span>
          </div>

          {/* Price History */}
          <div className="mb-8">
            <PriceChart marketId={marketId} />
          </div>

          {/* Orderbook - Admin Only */}
          {isAdmin && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-text-primary mb-4">Orderbook (Admin View)</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <OrderBook marketId={marketId} side="YES" />
                </div>
                <div>
                  <OrderBook marketId={marketId} side="NO" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column - Place Order (card) */}
        <div className="lg:col-span-1">
          <TradeInterface marketId={marketId} onOrderPlaced={loadMarket} />
        </div>
      </div>
    </div>
  );
}
