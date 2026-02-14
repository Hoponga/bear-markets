'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { marketsAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { Market } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user || !user.is_admin) {
      router.push('/');
      return;
    }

    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      const data = await marketsAPI.list('active');
      setMarkets(data);
    } catch (err) {
      console.error('Failed to load markets', err);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await marketsAPI.create(title, description, resolutionDate);
      setSuccess('Market created successfully!');
      setTitle('');
      setDescription('');
      setResolutionDate('');
      await loadMarkets();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create market');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveMarket = async (marketId: string, outcome: 'YES' | 'NO') => {
    if (!confirm(`Are you sure you want to resolve this market as ${outcome}?`)) {
      return;
    }

    try {
      await marketsAPI.resolve(marketId, outcome);
      alert(`Market resolved as ${outcome}!`);
      await loadMarkets();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resolve market');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin Panel</h1>

      {/* Create Market Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Market</h2>

        <form onSubmit={handleCreateMarket} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Market Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Will Bitcoin reach $100k by end of 2024?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Describe the market and resolution criteria..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolution Date
            </label>
            <input
              type="datetime-local"
              value={resolutionDate}
              onChange={(e) => setResolutionDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Creating...' : 'Create Market'}
          </button>
        </form>
      </div>

      {/* Active Markets */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Markets</h2>

        {markets.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {markets.map((market) => (
                  <tr key={market.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {market.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      ${market.total_volume.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          market.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {market.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {market.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleResolveMarket(market.id, 'YES')}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                          >
                            Resolve YES
                          </button>
                          <button
                            onClick={() => handleResolveMarket(market.id, 'NO')}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                          >
                            Resolve NO
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No active markets yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
