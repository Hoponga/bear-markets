'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { organizationsAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import MarketCard from '@/components/MarketCard';
import type { Organization, Market, LeaderboardEntry } from '@/types';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'markets' | 'leaderboard'>('markets');
  const [showCreateMarket, setShowCreateMarket] = useState(false);

  // Create market form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    loadOrganization();
    loadMarkets();
    loadLeaderboard();
  }, [orgId]);

  const loadOrganization = async () => {
    try {
      const data = await organizationsAPI.get(orgId);
      setOrganization(data);
    } catch (err) {
      console.error('Failed to load organization', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMarkets = async () => {
    try {
      const data = await organizationsAPI.getMarkets(orgId);
      setMarkets(data);
    } catch (err) {
      console.error('Failed to load markets', err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await organizationsAPI.getLeaderboard(orgId);
      setLeaderboard(data.entries);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await organizationsAPI.createMarket(orgId, title, description, resolutionDate);
      setShowCreateMarket(false);
      setTitle('');
      setDescription('');
      setResolutionDate('');
      await loadMarkets();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create market');
    }
  };

  const copyInviteLink = () => {
    if (!organization) return;
    const link = `${window.location.origin}/organizations/join?org=${orgId}&code=${organization.invite_code}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  };

  if (loading || !organization) {
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{organization.name}</h1>
            <p className="text-lg text-gray-600">{organization.description}</p>
          </div>
          <button
            onClick={copyInviteLink}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
          >
            📋 Copy Invite Link
          </button>
        </div>

        <div className="flex space-x-6 text-sm text-gray-500">
          <span>{organization.member_count} members</span>
          <span>{organization.initial_token_balance} initial tokens</span>
          <span>Created {new Date(organization.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('markets')}
            className={`pb-4 px-1 font-medium transition ${
              activeTab === 'markets'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Markets
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`pb-4 px-1 font-medium transition ${
              activeTab === 'leaderboard'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* Markets Tab */}
      {activeTab === 'markets' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Markets</h2>
            <button
              onClick={() => setShowCreateMarket(!showCreateMarket)}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              + Create Market
            </button>
          </div>

          {/* Create Market Form */}
          {showCreateMarket && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create Market</h3>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
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
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateMarket(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Markets Grid */}
          {markets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">No markets yet in this organization.</p>
              <button
                onClick={() => setShowCreateMarket(true)}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Create First Market
              </button>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Leaderboard</h2>

          {leaderboard.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Token Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Position Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry) => (
                    <tr key={entry.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-2xl font-bold ${
                            entry.rank === 1
                              ? 'text-yellow-500'
                              : entry.rank === 2
                              ? 'text-gray-400'
                              : entry.rank === 3
                              ? 'text-orange-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                        <div className="text-xs text-gray-500">{entry.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${entry.token_balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${entry.position_value.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-blue-600">
                          ${entry.total_value.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Loading leaderboard...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
