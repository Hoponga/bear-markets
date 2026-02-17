'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { marketsAPI, adminAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { Market, UserListEntry, MarketIdea } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'markets' | 'admins' | 'ideas'>('markets');

  // Markets state
  const [markets, setMarkets] = useState<Market[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [marketSuccess, setMarketSuccess] = useState('');

  // Admin management state
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  // Market ideas state
  const [ideas, setIdeas] = useState<MarketIdea[]>([]);
  const [ideasPage, setIdeasPage] = useState(1);
  const [ideasTotalPages, setIdeasTotalPages] = useState(1);
  const [ideasFilter, setIdeasFilter] = useState<string>('pending');

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user || !user.is_admin) {
      router.push('/');
      return;
    }

    loadMarkets();
    loadUsers();
    loadIdeas();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [usersPage]);

  useEffect(() => {
    loadIdeas();
  }, [ideasPage, ideasFilter]);

  const loadMarkets = async () => {
    try {
      const data = await marketsAPI.list('active');
      setMarkets(data);
    } catch (err) {
      console.error('Failed to load markets', err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await adminAPI.listUsers(usersPage, 10);
      setUsers(data.users);
      setUsersTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const loadIdeas = async () => {
    try {
      const data = await adminAPI.listMarketIdeas(ideasPage, 10, ideasFilter || undefined);
      setIdeas(data.ideas);
      setIdeasTotalPages(data.total_pages);
    } catch (err) {
      console.error('Failed to load ideas', err);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setMarketError('');
    setMarketSuccess('');
    setMarketLoading(true);

    try {
      await marketsAPI.create(title, description, resolutionDate);
      setMarketSuccess('Market created successfully!');
      setTitle('');
      setDescription('');
      setResolutionDate('');
      await loadMarkets();
    } catch (err: any) {
      setMarketError(err.response?.data?.detail || 'Failed to create market');
    } finally {
      setMarketLoading(false);
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

  const handleDeleteMarket = async (marketId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? All users will be refunded their tokens.`)) {
      return;
    }

    try {
      const result = await marketsAPI.delete(marketId);
      alert(result.message);
      await loadMarkets();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete market');
    }
  };

  const handleMakeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    setAdminLoading(true);

    try {
      const result = await adminAPI.makeAdmin(adminEmail);
      setAdminSuccess(result.message);
      setAdminEmail('');
      await loadUsers();
    } catch (err: any) {
      setAdminError(err.response?.data?.detail || 'Failed to make admin');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`Are you sure you want to remove admin status from ${email}?`)) {
      return;
    }

    try {
      const result = await adminAPI.removeAdmin(email);
      alert(result.message);
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove admin');
    }
  };

  const handleUpdateIdeaStatus = async (ideaId: string, status: string) => {
    try {
      await adminAPI.updateIdeaStatus(ideaId, status);
      await loadIdeas();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-text-primary mb-8">Admin Panel</h1>

      {/* Tab Navigation */}
      <div className="border-b border-border-primary mb-8">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('markets')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'markets'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-secondary'
            }`}
          >
            Markets
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admins'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-secondary'
            }`}
          >
            Admin Management
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ideas'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-secondary'
            }`}
          >
            Market Ideas
          </button>
        </nav>
      </div>

      {/* Markets Tab */}
      {activeTab === 'markets' && (
        <>
          {/* Create Market Form */}
          <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6 mb-12">
            <h2 className="text-2xl font-bold text-text-primary mb-4">Create New Market</h2>

            <form onSubmit={handleCreateMarket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Market Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-text-primary placeholder-text-disabled focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                  placeholder="e.g., Will Bitcoin reach $100k by end of 2024?"
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
                  className="w-full px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-text-primary placeholder-text-disabled focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                  rows={4}
                  placeholder="Describe the market and resolution criteria..."
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
                  className="w-full px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-text-primary focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                  required
                />
              </div>

              {marketError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                  <p className="text-sm text-red-400">{marketError}</p>
                </div>
              )}

              {marketSuccess && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                  <p className="text-sm text-green-400">{marketSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={marketLoading}
                className="w-full py-3 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover disabled:bg-btn-secondary disabled:text-text-disabled transition"
              >
                {marketLoading ? 'Creating...' : 'Create Market'}
              </button>
            </form>
          </div>

          {/* Active Markets */}
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">Active Markets</h2>

            {markets.length > 0 ? (
              <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary overflow-hidden">
                <table className="min-w-full divide-y divide-border-primary">
                  <thead className="bg-bg-hover">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                        Volume
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-primary">
                    {markets.map((market) => (
                      <tr key={market.id} className="hover:bg-bg-hover">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                          {market.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          ${market.total_volume.toFixed(0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              market.status === 'active'
                                ? 'bg-green-900/50 text-green-400'
                                : 'bg-btn-secondary text-text-muted'
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
                                className="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600 transition"
                              >
                                Resolve YES
                              </button>
                              <button
                                onClick={() => handleResolveMarket(market.id, 'NO')}
                                className="px-3 py-1 bg-red-700 text-white rounded hover:bg-red-600 transition"
                              >
                                Resolve NO
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteMarket(market.id, market.title)}
                            className="px-3 py-1 bg-btn-primary text-text-primary rounded hover:bg-btn-primary-hover transition"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
                <p className="text-text-muted">No active markets yet.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Admin Management Tab */}
      {activeTab === 'admins' && (
        <>
          {/* Make Admin Form */}
          <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6 mb-8">
            <h2 className="text-2xl font-bold text-text-primary mb-4">Add New Admin</h2>

            <form onSubmit={handleMakeAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  User Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-text-primary placeholder-text-disabled focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                  placeholder="user@example.com"
                  required
                />
              </div>

              {adminError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                  <p className="text-sm text-red-400">{adminError}</p>
                </div>
              )}

              {adminSuccess && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-3">
                  <p className="text-sm text-green-400">{adminSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={adminLoading}
                className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover disabled:bg-btn-secondary disabled:text-text-disabled transition"
              >
                {adminLoading ? 'Adding...' : 'Make Admin'}
              </button>
            </form>
          </div>

          {/* Users List */}
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-4">All Users</h2>

            <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary overflow-hidden">
              <table className="min-w-full divide-y divide-border-primary">
                <thead className="bg-bg-hover">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-bg-hover">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        ${user.token_balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            user.is_admin
                              ? 'bg-accent-purple/30 text-accent-purple'
                              : 'bg-btn-secondary text-text-muted'
                          }`}
                        >
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.is_admin && (
                          <button
                            onClick={() => handleRemoveAdmin(user.email)}
                            className="text-red-400 hover:text-red-300 font-medium"
                          >
                            Remove Admin
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {usersTotalPages > 1 && (
                <div className="bg-bg-hover px-6 py-4 flex items-center justify-between border-t border-border-primary">
                  <div className="text-sm text-text-muted">
                    Page {usersPage} of {usersTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUsersPage(usersPage - 1)}
                      disabled={usersPage === 1}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        usersPage === 1
                          ? 'bg-btn-secondary text-text-disabled cursor-not-allowed'
                          : 'bg-btn-secondary border border-border-secondary text-text-secondary hover:bg-btn-secondary-hover'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setUsersPage(usersPage + 1)}
                      disabled={usersPage === usersTotalPages}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        usersPage === usersTotalPages
                          ? 'bg-btn-secondary text-text-disabled cursor-not-allowed'
                          : 'bg-btn-secondary border border-border-secondary text-text-secondary hover:bg-btn-secondary-hover'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Market Ideas Tab */}
      {activeTab === 'ideas' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-text-primary">Market Ideas</h2>
            <select
              value={ideasFilter}
              onChange={(e) => {
                setIdeasFilter(e.target.value);
                setIdeasPage(1);
              }}
              className="px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-text-primary focus:ring-2 focus:ring-border-secondary"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {ideas.length > 0 ? (
            <div className="space-y-4">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary mb-1">
                        {idea.title}
                      </h3>
                      <p className="text-sm text-text-disabled mb-3">
                        Submitted by {idea.user_name} on{' '}
                        {new Date(idea.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-text-secondary">{idea.description}</p>
                    </div>
                    <span
                      className={`ml-4 px-3 py-1 text-xs font-medium rounded-full ${
                        idea.status === 'pending'
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : idea.status === 'approved'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {idea.status}
                    </span>
                  </div>

                  {idea.status === 'pending' && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleUpdateIdeaStatus(idea.id, 'approved')}
                        className="px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateIdeaStatus(idea.id, 'rejected')}
                        className="px-4 py-2 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {ideasTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-text-muted">
                    Page {ideasPage} of {ideasTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIdeasPage(ideasPage - 1)}
                      disabled={ideasPage === 1}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        ideasPage === 1
                          ? 'bg-btn-secondary text-text-disabled cursor-not-allowed'
                          : 'bg-btn-secondary border border-border-secondary text-text-secondary hover:bg-btn-secondary-hover'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setIdeasPage(ideasPage + 1)}
                      disabled={ideasPage === ideasTotalPages}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        ideasPage === ideasTotalPages
                          ? 'bg-btn-secondary text-text-disabled cursor-not-allowed'
                          : 'bg-btn-secondary border border-border-secondary text-text-secondary hover:bg-btn-secondary-hover'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
              <p className="text-text-muted">No market ideas found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
