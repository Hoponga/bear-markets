'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { marketsAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import MarketCard from '@/components/MarketCard';
import type { Market } from '@/types';

export default function PrivateMarketsPage() {
  const router = useRouter();
  const [myMarkets, setMyMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [initialTokens, setInitialTokens] = useState(1000);
  const [error, setError] = useState('');
  const [createdMarket, setCreatedMarket] = useState<Market | null>(null);

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    loadMyMarkets();
  }, []);

  const loadMyMarkets = async () => {
    try {
      const data = await marketsAPI.getMyPrivateMarkets();
      setMyMarkets(data);
    } catch (err) {
      console.error('Failed to load private markets', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const market = await marketsAPI.createPrivate(
        title,
        description,
        resolutionDate,
        initialTokens
      );
      setCreatedMarket(market);
      setShowCreateForm(false);
      await loadMyMarkets();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create market');
    }
  };

  const handleJoinMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await marketsAPI.joinPrivate(inviteCode);
      setShowJoinForm(false);
      setInviteCode('');
      await loadMyMarkets();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid invite code');
    }
  };

  const copyInviteLink = (market: Market) => {
    const link = `${window.location.origin}/private-markets?invite=${market.invite_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Private Markets</h1>
        <p className="text-lg text-gray-600">
          Create your own markets and share with select users
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          + Create Private Market
        </button>
        <button
          onClick={() => setShowJoinForm(!showJoinForm)}
          className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
        >
          Join with Code
        </button>
      </div>

      {/* Create Market Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Private Market</h2>
          <form onSubmit={handleCreateMarket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Market Question
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Will our team ship the feature by Friday?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description & Resolution Criteria
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={4}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial Token Balance (per user)
              </label>
              <input
                type="number"
                value={initialTokens}
                onChange={(e) => setInitialTokens(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                min="100"
                max="10000"
              />
              <p className="text-xs text-gray-500 mt-1">
                How many tokens each participant starts with in this market
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Create Market
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join Market Form */}
      {showJoinForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Private Market</h2>
          <form onSubmit={handleJoinMarket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Paste invite code here"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
              >
                Join Market
              </button>
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Created Market Success */}
      {createdMarket && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-green-900 mb-2">
            Market Created Successfully! 🎉
          </h3>
          <p className="text-sm text-green-700 mb-4">
            Share this invite link with others:
          </p>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={`${window.location.origin}/private-markets?invite=${createdMarket.invite_code}`}
              className="flex-1 px-4 py-2 bg-white border border-green-300 rounded-lg"
              readOnly
            />
            <button
              onClick={() => copyInviteLink(createdMarket)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Copy Link
            </button>
          </div>
          <button
            onClick={() => setCreatedMarket(null)}
            className="mt-4 text-sm text-green-700 hover:text-green-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* My Private Markets */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          My Private Markets ({myMarkets.length})
        </h2>

        {myMarkets.length > 0 ? (
          <div className="space-y-4">
            {myMarkets.map((market) => (
              <div key={market.id} className="relative">
                <MarketCard market={market} />
                <button
                  onClick={() => copyInviteLink(market)}
                  className="absolute top-4 right-4 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
                >
                  📋 Copy Invite Link
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">
              You haven't created or joined any private markets yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
