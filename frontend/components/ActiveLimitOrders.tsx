'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ordersAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { Order } from '@/types';

interface ActiveLimitOrdersProps {
  /** When set, only orders for this market are listed */
  marketId?: string;
  /** Increment or change to refetch (e.g. after placing or cancelling elsewhere) */
  refreshKey?: number;
  /** When true, show a link to the market for each row (profile / multi-market view) */
  showMarketLink?: boolean;
  /** Extra classes on the card when visible (e.g. profile spacing) */
  className?: string;
}

function isActiveOrder(o: Order) {
  return o.status === 'OPEN' || o.status === 'PARTIAL';
}

export default function ActiveLimitOrders({
  marketId,
  refreshKey = 0,
  showMarketLink = false,
  className = '',
}: ActiveLimitOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // getUser() returns a new object every call (JSON.parse) — never put that object in hook deps
  // or useCallback/useEffect will re-run every render and hammer the API.
  const userId = authStorage.getUser()?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await ordersAPI.getMyOrders({ activeOnly: true });
      let list = data.filter(isActiveOrder);
      if (marketId) {
        list = list.filter((o) => o.market_id === marketId);
      }
      setOrders(list);
    } catch {
      toast.error('Failed to load open orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [userId, marketId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await ordersAPI.cancel(orderId);
      toast.success('Order cancelled');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  if (!userId || orders.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-bg-card rounded-lg border border-border-primary p-6 ${className}`.trim()}
    >
      <h3 className="text-lg font-semibold text-text-primary mb-1">Open limit orders</h3>
      <p className="text-xs text-text-muted mb-4">
        Up to four resting limits per market: one each for YES buy, YES sell, NO buy, and NO sell.
        Cancel an order to replace it on that side and action.
      </p>

      <ul className={`space-y-3${loading ? ' opacity-60' : ''}`}>
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-b border-border-secondary last:border-0 last:pb-0"
          >
            <div className="text-sm text-text-secondary space-y-0.5">
              {showMarketLink && (
                <div>
                  <Link
                    href={`/market/${o.market_id}`}
                    className="font-medium text-accent-purple hover:underline"
                  >
                    {o.market_title || 'Market'}
                  </Link>
                </div>
              )}
              <div>
                <span
                  className={
                    o.side === 'YES' ? 'text-pred-yes' : 'text-pred-no'
                  }
                >
                  {o.side}
                </span>{' '}
                <span className="text-text-primary">{o.order_type}</span> · $
                {o.price.toFixed(2)} · {o.filled_quantity}/{o.quantity} filled ·{' '}
                <span className="text-text-muted">{o.status}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCancel(o.id)}
              disabled={cancellingId === o.id || loading}
              className="shrink-0 px-3 py-1.5 text-sm rounded-lg border border-border-secondary text-text-muted hover:text-text-primary hover:border-text-muted disabled:opacity-50 transition"
            >
              {cancellingId === o.id ? 'Cancelling…' : 'Pull'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
