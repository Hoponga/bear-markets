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
      <h1 className="text-4xl font-bold text-white mb-8">Admin Panel</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700 mb-8">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('markets')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'markets'
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            Markets
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admins'
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            Admin Management
          </button>
          <button
            onClick={() => setActiveTab('ideas')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ideas'
                ? 'border-white text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
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

              {marketError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{marketError}</p>
                </div>
              )}

              {marketSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-600">{marketSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={marketLoading}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {marketLoading ? 'Creating...' : 'Create Market'}
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
                          <button
                            onClick={() => handleDeleteMarket(market.id, market.title)}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No active markets yet.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Admin Management Tab */}
      {activeTab === 'admins' && (
        <>
          {/* Make Admin Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Admin</h2>

            <form onSubmit={handleMakeAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                  required
                />
              </div>

              {adminError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{adminError}</p>
                </div>
              )}

              {adminSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-600">{adminSuccess}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={adminLoading}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {adminLoading ? 'Adding...' : 'Make Admin'}
              </button>
            </form>
          </div>

          {/* Users List */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">All Users</h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${user.token_balance.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            user.is_admin
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.is_admin && (
                          <button
                            onClick={() => handleRemoveAdmin(user.email)}
                            className="text-red-600 hover:text-red-800 font-medium"
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
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Page {usersPage} of {usersTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUsersPage(usersPage - 1)}
                      disabled={usersPage === 1}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        usersPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setUsersPage(usersPage + 1)}
                      disabled={usersPage === usersTotalPages}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        usersPage === usersTotalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
            <h2 className="text-2xl font-bold text-gray-900">Market Ideas</h2>
            <select
              value={ideasFilter}
              onChange={(e) => {
                setIdeasFilter(e.target.value);
                setIdeasPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {idea.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Submitted by {idea.user_name} on{' '}
                        {new Date(idea.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-gray-700">{idea.description}</p>
                    </div>
                    <span
                      className={`ml-4 px-3 py-1 text-xs font-medium rounded-full ${
                        idea.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : idea.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {idea.status}
                    </span>
                  </div>

                  {idea.status === 'pending' && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleUpdateIdeaStatus(idea.id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateIdeaStatus(idea.id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
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
                  <div className="text-sm text-gray-600">
                    Page {ideasPage} of {ideasTotalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIdeasPage(ideasPage - 1)}
                      disabled={ideasPage === 1}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        ideasPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setIdeasPage(ideasPage + 1)}
                      disabled={ideasPage === ideasTotalPages}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        ideasPage === ideasTotalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No market ideas found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
