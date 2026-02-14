'use client';

import { useState, useEffect } from 'react';
import { marketsAPI, marketIdeasAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import MarketCard from '@/components/MarketCard';
import type { Market, User } from '@/types';

export default function HomePage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

  // Market idea form state
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [ideaSuccess, setIdeaSuccess] = useState('');
  const [ideaError, setIdeaError] = useState('');

  useEffect(() => {
    loadMarkets();
    setUser(authStorage.getUser());
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

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdeaError('');
    setIdeaSuccess('');
    setIdeaLoading(true);

    try {
      await marketIdeasAPI.submit(ideaTitle, ideaDescription);
      setIdeaSuccess('Your market idea has been submitted for review!');
      setIdeaTitle('');
      setIdeaDescription('');
      setTimeout(() => {
        setShowIdeaForm(false);
        setIdeaSuccess('');
      }, 2000);
    } catch (err: any) {
      setIdeaError(err.response?.data?.detail || 'Failed to submit idea');
    } finally {
      setIdeaLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Active Markets
          </h1>
          <p className="text-lg text-gray-400">
            Trade on prediction markets at the number one public university in the world
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowIdeaForm(!showIdeaForm)}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition flex-shrink-0"
          >
            {showIdeaForm ? 'Cancel' : 'Suggest a Market'}
          </button>
        )}
      </div>

      {/* Market Idea Form */}
      {showIdeaForm && user && (
        <div className="mb-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Suggest a New Market</h2>
          <p className="text-gray-400 mb-4">
            Have an idea for a prediction market? Submit it here and our team will review it.
          </p>

          <form onSubmit={handleSubmitIdea} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Market Title
              </label>
              <input
                type="text"
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                placeholder="e.g., Will the new student center open by Fall 2025?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description & Resolution Criteria
              </label>
              <textarea
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                rows={4}
                placeholder="Describe your market idea and how it should be resolved..."
                required
              />
            </div>

            {ideaError && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                <p className="text-sm text-red-400">{ideaError}</p>
              </div>
            )}

            {ideaSuccess && (
              <div className="bg-green-900/50 border border-green-700 rounded-lg p-3">
                <p className="text-sm text-green-400">{ideaSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={ideaLoading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:bg-gray-600 transition"
            >
              {ideaLoading ? 'Submitting...' : 'Submit Idea'}
            </button>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          <p className="mt-4 text-gray-400">Loading markets...</p>
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
            <div className="text-center py-12 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
              <p className="text-gray-400 text-lg">No active markets yet.</p>
              <p className="text-gray-500 mt-2">Check back soon!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
