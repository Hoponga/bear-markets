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

  return (
    <Link href={`/market/${market.id}`}>
      <div className="bg-bg-card rounded-lg transition border border-border-primary p-6 cursor-pointer hover:border-border-secondary overflow-visible">
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
