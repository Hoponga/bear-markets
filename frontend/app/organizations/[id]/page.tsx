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
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
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
      setLeaderboardLoading(true);
      const data = await organizationsAPI.getLeaderboard(orgId);
      console.log('Leaderboard data:', data); // Debug log
      setLeaderboard(data.entries || []);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
      setLeaderboard([]);
    } finally {
      setLeaderboardLoading(false);
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-text-primary mb-2">{organization.name}</h1>
            <p className="text-lg text-text-muted">{organization.description}</p>
          </div>
          <button
            onClick={copyInviteLink}
            className="px-4 py-2 bg-btn-secondary text-text-primary rounded-lg hover:bg-btn-secondary-hover transition"
          >
            📋 Copy Invite Link
          </button>
        </div>

        <div className="flex space-x-6 text-sm">
          <span className="text-text-disabled">{organization.member_count} members</span>
          <span className="text-text-disabled">{organization.initial_token_balance} initial tokens</span>
          <span className="text-text-primary font-semibold">💰 {organization.user_token_balance.toFixed(2)} your tokens</span>
          <span className="text-text-disabled">Created {new Date(organization.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-secondary mb-8">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('markets')}
            className={`pb-4 px-1 font-medium transition ${
              activeTab === 'markets'
                ? 'border-b-2 border-text-primary text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Markets
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`pb-4 px-1 font-medium transition ${
              activeTab === 'leaderboard'
                ? 'border-b-2 border-text-primary text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
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
            <h2 className="text-2xl font-bold text-text-primary">Markets</h2>
            <button
              onClick={() => setShowCreateMarket(!showCreateMarket)}
              className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover"
            >
              + Create Market
            </button>
          </div>

          {/* Create Market Form */}
          {showCreateMarket && (
            <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6 mb-6">
              <h3 className="text-xl font-bold text-text-primary mb-4">Create Market</h3>
              <form onSubmit={handleCreateMarket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Market Question
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Resolution Date
                  </label>
                  <input
                    type="datetime-local"
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                    required
                  />
                </div>
                {error && (
                  <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateMarket(false)}
                    className="px-6 py-2 bg-btn-secondary text-text-secondary font-medium rounded-lg hover:bg-btn-secondary-hover"
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
            <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
              <p className="text-text-muted mb-4">No markets yet in this organization.</p>
              <button
                onClick={() => setShowCreateMarket(true)}
                className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover"
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
          <h2 className="text-2xl font-bold text-text-primary mb-6">Leaderboard</h2>

          {leaderboardLoading ? (
            <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted mb-4"></div>
              <p className="text-text-muted">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary overflow-hidden">
              <table className="min-w-full divide-y divide-border-secondary">
                <thead className="bg-bg-hover">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-disabled uppercase">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-disabled uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-disabled uppercase">
                      Token Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-disabled uppercase">
                      Position Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-disabled uppercase">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-bg-card divide-y divide-border-secondary">
                  {leaderboard.map((entry) => (
                    <tr key={entry.user_id} className="hover:bg-bg-hover">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-2xl font-bold ${
                            entry.rank === 1
                              ? 'text-yellow-500'
                              : entry.rank === 2
                              ? 'text-gray-400'
                              : entry.rank === 3
                              ? 'text-orange-600'
                              : 'text-text-primary'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text-primary">{entry.name}</div>
                        <div className="text-xs text-text-disabled">{entry.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        ${entry.token_balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        ${entry.position_value.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-text-primary">
                          ${entry.total_value.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
              <p className="text-text-muted">No members in this organization yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
