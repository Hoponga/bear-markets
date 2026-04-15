'use client';

import Link from 'next/link';
import OrderBookTooltip from '@/components/OrderBookTooltip';
import type { Market } from '@/types';

interface MarketCardProps {
  market: Market;
}

export default function MarketCard({ market }: MarketCardProps) {
  const yesPrice = (market.current_yes_price * 100).toFixed(1);
  const noPrice = (market.current_no_price * 100).toFixed(1);
  const isParent = market.is_parent;

  return (
    <Link href={`/market/${market.id}`}>
      <div className="bg-bg-card rounded-lg transition border border-border-primary p-6 cursor-pointer hover:border-border-secondary overflow-visible">
        {isParent && (
          <div className="mb-2">
            <span className="px-2 py-1 text-xs font-medium rounded bg-accent-purple/20 text-accent-purple">
              Market Group
            </span>
          </div>
        )}

        <h3 className="text-lg font-semibold text-text-primary mb-3 line-clamp-2">
          {market.title}
        </h3>

        {market.status === 'resolved' && market.resolved_outcome && (
          <div className="mb-3">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Outcome</span>
            <p
              className={`text-base font-semibold mt-0.5 ${
                market.resolved_outcome === 'YES' ? 'text-pred-yes' : 'text-pred-no'
              }`}
            >
              Resolved {market.resolved_outcome}
            </p>
          </div>
        )}

        <p className="text-sm text-text-muted mb-4 line-clamp-2">
          {market.description}
        </p>

        {isParent ? (
          <div className="bg-bg-hover rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-lg font-semibold text-text-primary">
                {market.child_count || 0} related market{(market.child_count || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-text-muted text-center mt-1">
              Click to view all options
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4 overflow-visible">
            <OrderBookTooltip market={market} side="YES">
              <div className="bg-pred-yes-surface border border-pred-yes-ring rounded-lg p-3">
                <p className="text-xs text-pred-yes font-medium mb-1">YES</p>
                <p className="text-2xl font-bold text-pred-yes">{yesPrice}¢</p>
              </div>
            </OrderBookTooltip>
            <OrderBookTooltip market={market} side="NO">
              <div className="bg-pred-no-surface border border-pred-no-ring rounded-lg p-3">
                <p className="text-xs text-pred-no font-medium mb-1">NO</p>
                <p className="text-2xl font-bold text-pred-no">{noPrice}¢</p>
              </div>
            </OrderBookTooltip>
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-text-disabled">
          <span>Volume: ${market.total_volume.toFixed(0)}</span>
          <span className={market.status === 'active' ? 'text-success' : 'text-text-disabled'}>
            {market.status === 'active' ? '● Active' : '○ Resolved'}
          </span>
        </div>
      </div>
    </Link>
  );
}
