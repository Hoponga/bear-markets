'use client';

import { useState, useEffect } from 'react';
import { marketsAPI } from '@/lib/api';
import Link from 'next/link';
import MarketCard from '@/components/MarketCard';
import type { Market } from '@/types';

export default function HomePage() {
  const [activeMarkets, setActiveMarkets] = useState<Market[]>([]);
  const [resolvedMarkets, setResolvedMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      const [active, resolved] = await Promise.all([
        marketsAPI.list('active'),
        marketsAPI.list('resolved'),
      ]);
      setActiveMarkets(active);
      setResolvedMarkets(resolved);
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
      <div className="pt-16 mb-8">
        <h1 className="text-6xl font-bold tracking-tight text-[rgb(var(--foreground))] mb-6">Bet on what happens next at Berkeley</h1>
        <p className="text-lg text-text-secondary mb-16">
          Bearmarket is a free prediction market platform made for Berkeley where you can trade on the outcomes of future events.
        </p>
        <p className="text-2xl text-[rgb(var(--foreground))] font-semibold mb-2">How it works</p>
        <p className="text-text-secondary text-lg mb-3">
          Buy <span className="text-text-secondary font-medium">YES</span> shares if you think something will happen, or <span className="text-text-secondary font-medium">NO</span> if you don't. Prices reflect the crowd's probability—if YES trades at 70¢, the market thinks there's a 70% chance. When the event resolves, winning shares pay $1 each. You can also sell shares you own.
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
        <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg p-4">
          <p className="text-[var(--error-text)]">{error}</p>
        </div>
      )}

      {/* Markets: active first, resolved at bottom */}
      {!loading && !error && (
        <>
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Active markets</h2>
            {activeMarkets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-bg-card rounded-lg border border-border-primary">
                <p className="text-text-muted text-lg">No active markets yet.</p>
                <p className="text-text-disabled mt-2">Check back soon!</p>
              </div>
            )}
          </div>

          {resolvedMarkets.length > 0 && (
            <div className="border-t border-border-secondary pt-10">
              <h2 className="text-lg font-semibold text-text-primary mb-2">Resolved markets</h2>
              <p className="text-sm text-text-muted mb-4">
                Past outcomes—click a market to see details.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-95">
                {resolvedMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
