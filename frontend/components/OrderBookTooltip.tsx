'use client';

import type { ReactNode } from 'react';
import type { Market } from '@/types';

function formatQuoteCents(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}¢`;
}

interface OrderBookTooltipProps {
  market: Market;
  side: 'YES' | 'NO';
  children: ReactNode;
  /** Extra classes on the positioning wrapper (e.g. h-full) */
  className?: string;
  /** Show tooltip on keyboard focus (use outside of links) */
  keyboardFocus?: boolean;
}

export default function OrderBookTooltip({
  market,
  side,
  children,
  className = '',
  keyboardFocus = false,
}: OrderBookTooltipProps) {
  if (market.status !== 'active') {
    return <div className={className}>{children}</div>;
  }

  const bid = side === 'YES' ? market.yes_best_bid : market.no_best_bid;
  const ask = side === 'YES' ? market.yes_best_ask : market.no_best_ask;

  const focusCls = keyboardFocus
    ? 'group-focus-within/quote:opacity-100 group-focus-within/quote:translate-y-0'
    : '';

  return (
    <div
      className={`relative group/quote ${className} ${keyboardFocus ? 'rounded-lg outline-none focus-within:ring-2 focus-within:ring-border-secondary' : ''}`}
      tabIndex={keyboardFocus ? 0 : undefined}
    >
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 z-30 w-max max-w-[min(240px,calc(100vw-2rem))] -translate-x-1/2 bottom-full mb-2 rounded-md border border-border-secondary bg-bg-card px-3 py-2 text-left text-xs text-text-secondary shadow-lg opacity-0 translate-y-1 transition-all duration-150 group-hover/quote:opacity-100 group-hover/quote:translate-y-0 ${focusCls}`}
      >
        <p className="mb-1.5 font-medium text-text-primary">Order book · {side}</p>
        <p className="leading-snug">
          <span className="text-text-muted">Highest buy (bid): </span>
          <span className="tabular-nums text-text-primary">{formatQuoteCents(bid)}</span>
        </p>
        <p className="leading-snug">
          <span className="text-text-muted">Lowest sell (ask): </span>
          <span className="tabular-nums text-text-primary">{formatQuoteCents(ask)}</span>
        </p>
      </div>
    </div>
  );
}
