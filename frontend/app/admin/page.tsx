'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { marketsAPI, adminAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { Market, UserListEntry, MarketIdea, BotStatus } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'markets' | 'admins' | 'ideas' | 'bots'>('markets');

  // Markets state
  const [markets, setMarkets] = useState<Market[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [isParent, setIsParent] = useState(false);
  const [parentMarketId, setParentMarketId] = useState('');
  const [initialYesPrice, setInitialYesPrice] = useState(50);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [marketSuccess, setMarketSuccess] = useState('');
  const [parentMarkets, setParentMarkets] = useState<Market[]>([]);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Record<string, Market[]>>({});

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

  // Bot monitoring state
  const [bots, setBots] = useState<BotStatus[]>([]);
  const [botsLoading, setBotsLoading] = useState(false);

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user || !user.is_admin) {
      router.push('/');
      return;
    }

    loadMarkets();
    loadUsers();
    loadIdeas();
    loadBots();
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
      // Filter parent markets for dropdown
      setParentMarkets(data.filter(m => m.is_parent));
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

  const loadBots = async () => {
    setBotsLoading(true);
    try {
      const data = await adminAPI.getBots();
      setBots(data.bots);
    } catch (err) {
      console.error('Failed to load bots', err);
    } finally {
      setBotsLoading(false);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setMarketError('');
    setMarketSuccess('');
    setMarketLoading(true);

    try {
      await marketsAPI.create(title, description, parentMarketId ? null : resolutionDate, {
        isParent: isParent,
        parentMarketId: parentMarketId || undefined,
        initialYesPrice: isParent ? 0.5 : initialYesPrice / 100,
      });
      setMarketSuccess('Market created successfully!');
      setTitle('');
      setDescription('');
      setResolutionDate('');
      setIsParent(false);
      setParentMarketId('');
      setInitialYesPrice(50);
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

  const handleMakeAdminDirect = async (email: string, name: string) => {
    if (!confirm(`Make ${name} (${email}) an admin?`)) {
      return;
    }

    try {
      const result = await adminAPI.makeAdmin(email);
      alert(result.message);
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to make admin');
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

  const toggleParentExpanded = async (marketId: string) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(marketId)) {
      newExpanded.delete(marketId);
    } else {
      newExpanded.add(marketId);
      // Load children if not already loaded
      if (!childrenMap[marketId]) {
        try {
          const children = await marketsAPI.getChildren(marketId);
          setChildrenMap(prev => ({ ...prev, [marketId]: children }));
        } catch (err) {
          console.error('Failed to load children', err);
        }
      }
    }
    setExpandedParents(newExpanded);
  };

  const handleResolveChildMarket = async (childId: string, outcome: 'YES' | 'NO', parentId: string) => {
    if (!confirm(`Are you sure you want to resolve this market as ${outcome}?`)) {
      return;
    }

    try {
      await marketsAPI.resolve(childId, outcome);
      // Reload children for this parent
      const children = await marketsAPI.getChildren(parentId);
      setChildrenMap(prev => ({ ...prev, [parentId]: children }));
      // Reload main markets list to update parent status
      await loadMarkets();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resolve market');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-semibold text-text-primary mb-8">Admin Panel</h1>

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
          <button
            onClick={() => setActiveTab('bots')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bots'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-secondary'
            }`}
          >
            Bot Monitor
          </button>
        </nav>
      </div>

      {/* Markets Tab */}
      {activeTab === 'markets' && (
        <>
          {/* Create Market Form */}
          <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6 mb-12">
            <h2 className="text-2xl font-medium text-text-primary mb-4">Create New Market</h2>

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

              {!isParent && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Starting YES Price
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="99"
                      value={initialYesPrice}
                      onChange={(e) => setInitialYesPrice(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-bg-input rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex gap-3 text-sm">
                      <span className="text-pred-yes font-medium">YES: {initialYesPrice}¢</span>
                      <span className="text-pred-no font-medium">NO: {100 - initialYesPrice}¢</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Set the initial probability. Default is 50/50.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isParent}
                    onChange={(e) => {
                      setIsParent(e.target.checked);
                      if (e.target.checked) setParentMarketId('');
                    }}
                    disabled={!!parentMarketId}
                    className="w-4 h-4 rounded border-border-secondary bg-bg-input"
                  />
                  <span className="text-sm text-text-secondary">
                    This is a parent market (groups related markets)
                  </span>
                </label>
              </div>

              {!isParent && parentMarkets.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Parent Market (optional)
                  </label>
                  <select
                    value={parentMarketId}
                    onChange={(e) => setParentMarketId(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-text-primary focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                  >
                    <option value="">No parent (standalone market)</option>
                    {parentMarkets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-muted mt-1">
                    Select a parent market to add this as a child market
                  </p>
                </div>
              )}

              {!parentMarketId && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Resolution Date
                  </label>
                  <input
                    type="datetime-local"
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-text-primary focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                    required={!parentMarketId}
                  />
                  {parentMarketId && (
                    <p className="text-xs text-text-muted mt-1">
                      Child markets inherit resolution date from parent
                    </p>
                  )}
                </div>
              )}

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
            <h2 className="text-2xl font-medium text-text-primary mb-4">Active Markets</h2>

            {markets.length > 0 ? (
              <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary overflow-hidden">
                <table className="min-w-full divide-y divide-border-primary">
                  <thead className="bg-bg-hover">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                        Type
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
                      <Fragment key={market.id}>
                        <tr className="hover:bg-bg-hover">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                            {market.is_parent && (
                              <button
                                onClick={() => toggleParentExpanded(market.id)}
                                className="mr-2 text-text-muted hover:text-text-primary"
                              >
                                {expandedParents.has(market.id) ? '▼' : '▶'}
                              </button>
                            )}
                            {market.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {market.is_parent ? (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-accent-purple/30 text-accent-purple">
                                Parent ({market.child_count || 0} children)
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-btn-secondary text-text-muted">
                                Standard
                              </span>
                            )}
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
                            {market.status === 'active' && !market.is_parent && (
                              <>
                                <button
                                  onClick={() => handleResolveMarket(market.id, 'YES')}
                                  className="px-3 py-1 bg-pred-yes-btn text-white rounded hover:bg-pred-yes-btn-hover transition"
                                >
                                  Resolve YES
                                </button>
                                <button
                                  onClick={() => handleResolveMarket(market.id, 'NO')}
                                  className="px-3 py-1 bg-pred-no-btn text-white rounded hover:bg-pred-no-btn-hover transition"
                                >
                                  Resolve NO
                                </button>
                              </>
                            )}
                            {market.is_parent && market.status === 'active' && (
                              <button
                                onClick={() => toggleParentExpanded(market.id)}
                                className="px-3 py-1 bg-accent-purple/30 text-accent-purple rounded hover:bg-accent-purple/50 transition"
                              >
                                {expandedParents.has(market.id) ? 'Hide Children' : 'Manage Children'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteMarket(market.id, market.title)}
                              className="px-3 py-1 bg-btn-primary text-text-primary rounded hover:bg-btn-primary-hover transition"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                        {/* Child markets row */}
                        {market.is_parent && expandedParents.has(market.id) && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-bg-hover/50">
                              <div className="ml-6 border-l-2 border-accent-purple/30 pl-4">
                                <p className="text-xs text-text-muted mb-3 uppercase tracking-wide">Child Markets</p>
                                {childrenMap[market.id]?.length ? (
                                  <div className="space-y-2">
                                    {childrenMap[market.id].map((child) => (
                                      <div
                                        key={child.id}
                                        className="flex items-center justify-between bg-bg-card rounded-lg p-3 border border-border-primary"
                                      >
                                        <div className="flex-1">
                                          <span className="text-sm font-medium text-text-primary">
                                            {child.title}
                                          </span>
                                          <div className="flex gap-3 mt-1 text-xs text-text-muted">
                                            <span>YES: {(child.current_yes_price * 100).toFixed(0)}¢</span>
                                            <span>NO: {(child.current_no_price * 100).toFixed(0)}¢</span>
                                            <span>Vol: ${child.total_volume.toFixed(0)}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`px-2 py-1 text-xs font-medium rounded ${
                                              child.status === 'active'
                                                ? 'bg-green-900/50 text-green-400'
                                                : child.resolved_outcome === 'YES'
                                                ? 'bg-pred-yes-surface text-pred-yes'
                                                : 'bg-pred-no-surface text-pred-no'
                                            }`}
                                          >
                                            {child.status === 'resolved' ? `Resolved ${child.resolved_outcome}` : 'Active'}
                                          </span>
                                          {child.status === 'active' && (
                                            <>
                                              <button
                                                onClick={() => handleResolveChildMarket(child.id, 'YES', market.id)}
                                                className="px-2 py-1 text-xs bg-pred-yes-btn text-white rounded hover:bg-pred-yes-btn-hover transition"
                                              >
                                                YES
                                              </button>
                                              <button
                                                onClick={() => handleResolveChildMarket(child.id, 'NO', market.id)}
                                                className="px-2 py-1 text-xs bg-pred-no-btn text-white rounded hover:bg-pred-no-btn-hover transition"
                                              >
                                                NO
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-text-muted">No child markets yet.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
            <h2 className="text-2xl font-medium text-text-primary mb-4">Add New Admin</h2>

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
            <h2 className="text-2xl font-medium text-text-primary mb-4">All Users</h2>

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
                        {user.is_bot && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-blue-900/30 text-blue-400">
                            Bot
                          </span>
                        )}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                        {user.is_admin ? (
                          <button
                            onClick={() => handleRemoveAdmin(user.email)}
                            className="text-red-400 hover:text-red-300 font-medium"
                          >
                            Remove Admin
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMakeAdminDirect(user.email, user.name)}
                            className="text-accent-purple hover:text-accent-purple/80 font-medium"
                          >
                            Make Admin
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
            <h2 className="text-2xl font-medium text-text-primary">Market Ideas</h2>
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

      {/* Bot Monitor Tab */}
      {activeTab === 'bots' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-medium text-text-primary">Bot Accounts</h2>
            <button
              onClick={loadBots}
              disabled={botsLoading}
              className="px-4 py-2 bg-btn-secondary border border-border-secondary text-text-secondary rounded-lg hover:bg-btn-secondary-hover transition disabled:opacity-50"
            >
              {botsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {botsLoading && bots.length === 0 ? (
            <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
              <p className="text-text-muted">Loading bots...</p>
            </div>
          ) : bots.length > 0 ? (
            <div className="space-y-6">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        {bot.name}
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-900/30 text-blue-400">
                          Bot
                        </span>
                      </h3>
                      <p className="text-sm text-text-muted">{bot.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-text-primary">
                        ${bot.token_balance.toFixed(2)}
                      </p>
                      <p className="text-xs text-text-muted">Token Balance</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-bg-hover rounded-lg p-3">
                      <p className="text-sm text-text-muted">Position Value</p>
                      <p className="text-lg font-medium text-text-primary">
                        ${bot.total_position_value.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-bg-hover rounded-lg p-3">
                      <p className="text-sm text-text-muted">Open Orders</p>
                      <p className="text-lg font-medium text-text-primary">
                        {bot.open_orders_count}
                      </p>
                    </div>
                    <div className="bg-bg-hover rounded-lg p-3">
                      <p className="text-sm text-text-muted">24h Trades</p>
                      <p className="text-lg font-medium text-text-primary">
                        {bot.recent_trades_24h}
                      </p>
                    </div>
                    <div className="bg-bg-hover rounded-lg p-3">
                      <p className="text-sm text-text-muted">Total Value</p>
                      <p className="text-lg font-medium text-accent-green">
                        ${(bot.token_balance + bot.total_position_value).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {bot.positions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-text-secondary mb-2">
                        Positions ({bot.positions.length})
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-primary text-sm">
                          <thead>
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">
                                Market
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">
                                YES
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">
                                NO
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-primary">
                            {bot.positions.map((pos, idx) => (
                              <tr key={idx} className="hover:bg-bg-hover">
                                <td className="px-3 py-2 text-text-primary max-w-xs truncate">
                                  {pos.market_title}
                                </td>
                                <td className="px-3 py-2">
                                  {pos.yes_shares > 0 && (
                                    <span className="text-pred-yes">
                                      {pos.yes_shares} @ {(pos.avg_yes_price * 100).toFixed(0)}¢
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  {pos.no_shares > 0 && (
                                    <span className="text-pred-no">
                                      {pos.no_shares} @ {(pos.avg_no_price * 100).toFixed(0)}¢
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-0.5 text-xs rounded ${
                                      pos.market_status === 'active'
                                        ? 'bg-green-900/50 text-green-400'
                                        : 'bg-btn-secondary text-text-muted'
                                    }`}
                                  >
                                    {pos.market_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
              <p className="text-text-muted">No bot accounts found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
