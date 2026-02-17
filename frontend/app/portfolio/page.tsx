'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, ordersAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import PositionsList from '@/components/PositionsList';
import type { Portfolio, Order } from '@/types';

export default function PortfolioPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user) {
      router.push('/');
      return;
    }

    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const data = await authAPI.getPortfolio();
      setPortfolio(data);
    } catch (err: any) {
      setError('Failed to load portfolio');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await ordersAPI.cancel(orderId);
      await loadPortfolio(); // Refresh
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to cancel order');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
          <p className="mt-4 text-text-muted">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-6">
          <p className="text-red-400">{error || 'Failed to load portfolio'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-semibold text-text-primary mb-2">Portfolio</h1>
        <p className="text-lg text-text-muted">
          Token Balance:{' '}
          <span className="font-bold text-text-primary">
            ${portfolio.token_balance.toFixed(2)}
          </span>
        </p>
      </div>

      {/* Positions */}
      <div className="mb-12">
        <h2 className="text-2xl font-medium text-text-primary mb-4">Your Positions</h2>
        <PositionsList positions={portfolio.positions} />
      </div>

      {/* Open Orders */}
      <div>
        <h2 className="text-2xl font-medium text-text-primary mb-4">Open Orders</h2>
        {portfolio.open_orders.length > 0 ? (
          <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary overflow-hidden">
            <table className="min-w-full divide-y divide-border-primary">
              <thead className="bg-bg-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Market
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Side
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Filled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {portfolio.open_orders.map((order) => (
                  <tr key={order.id} className="hover:bg-bg-hover">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {order.market_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          order.side === 'YES'
                            ? 'bg-green-900/50 text-green-400 border border-green-700'
                            : 'bg-red-900/50 text-red-400 border border-red-700'
                        }`}
                      >
                        {order.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          order.order_type === 'BUY'
                            ? 'bg-bg-hover text-text-secondary border border-border-secondary'
                            : 'bg-orange-900/50 text-orange-400 border border-orange-700'
                        }`}
                      >
                        {order.order_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      ${order.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                      {order.filled_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                      {order.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="text-sm text-red-400 hover:text-red-300 font-medium"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
            <p className="text-text-muted">You don't have any open orders.</p>
          </div>
        )}
      </div>
    </div>
  );
}
