'use client';

import { useState, useEffect } from 'react';
import { marketsAPI } from '@/lib/api';
import Link from 'next/link';
import MarketCard from '@/components/MarketCard';
import type { Market } from '@/types';

export default function HomePage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      const data = await marketsAPI.list('active');
      setMarkets(data);
    } catch (err: any) {
      setError('Failed to load markets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Introduction */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-3">What is Bearmarket?</h1>
        <p className="text-text-secondary mb-3">
          Bearmarket is a free prediction market platform made for Berkeley where you can trade on the outcomes of future events.
        </p>
        <p className="text-text-muted text-sm mb-3">
          Buy <span className="text-green-400 font-medium">YES</span> shares if you think something will happen, or <span className="text-red-400 font-medium">NO</span> if you don't. Prices reflect the crowd's probability—if YES trades at 70¢, the market thinks there's a 70% chance. When the event resolves, winning shares pay $1 each. You can also sell shares you own.
        </p>
        <p className="text-text-muted text-sm">
          Want private markets with friends or your club? Check out <Link href="/organizations" className="text-text-secondary hover:text-text-primary underline">Organizations</Link>.{' '}
          <Link href="/about" className="text-text-secondary hover:text-text-primary underline">Learn more</Link> about how it works, or <Link href="/suggest" className="text-text-secondary hover:text-text-primary underline">suggest a market</Link>.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
          <p className="mt-4 text-text-muted">Loading markets...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Markets Grid */}
      {!loading && !error && (
        <>
          {markets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-bg-card rounded-lg shadow-lg border border-border-primary">
              <p className="text-text-muted text-lg">No active markets yet.</p>
              <p className="text-text-disabled mt-2">Check back soon!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
