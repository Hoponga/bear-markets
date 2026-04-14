'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { organizationsAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { Organization, PoolBet, LeaderboardEntry, OrganizationMember } from '@/types';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [bets, setBets] = useState<PoolBet[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bets' | 'leaderboard' | 'admin'>('bets');

  // Nickname editing
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);

  // Create bet modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [betTitle, setBetTitle] = useState('');
  const [betDescription, setBetDescription] = useState('');
  const [betType, setBetType] = useState<'fixed' | 'variable'>('fixed');
  const [fixedFee, setFixedFee] = useState(10);
  const [minFee, setMinFee] = useState(5);
  const [seedYes, setSeedYes] = useState(10);
  const [seedNo, setSeedNo] = useState(10);
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user) { router.push('/'); return; }

    loadOrganization();
    loadBets();
    loadLeaderboard();
    loadMembers();
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

  const loadBets = async () => {
    try {
      const data = await organizationsAPI.getBets(orgId);
      setBets(data);
    } catch (err) {
      console.error('Failed to load bets', err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await organizationsAPI.getLeaderboard(orgId);
      setLeaderboard(data.entries || []);
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await organizationsAPI.getMembers(orgId);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load members', err);
    }
  };

  const handleCreateBet = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      await organizationsAPI.createBet(orgId, betTitle, betDescription, betType, {
        fixedFee: betType === 'fixed' ? fixedFee : undefined,
        minFee: betType === 'variable' ? minFee : undefined,
        seedYes: betType === 'variable' ? seedYes : undefined,
        seedNo: betType === 'variable' ? seedNo : undefined,
      });
      setShowCreateModal(false);
      setBetTitle('');
      setBetDescription('');
      setBetType('fixed');
      await loadBets();
      await loadOrganization();
      toast.success('Bet created!');
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create bet');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditBalance = async (userId: string, currentBalance: number) => {
    const newBalance = prompt('Enter new balance:', currentBalance.toString());
    if (newBalance === null) return;
    try {
      await organizationsAPI.editMemberBalance(orgId, userId, parseFloat(newBalance));
      await loadMembers();
      await loadLeaderboard();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update balance');
    }
  };

  const handleUpdateNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNickname(true);
    try {
      const nickname = newNickname.trim() || null;
      await organizationsAPI.updateMyNickname(orgId, nickname);
      setOrganization(prev => prev ? { ...prev, user_nickname: nickname } : prev);
      setEditingNickname(false);
      toast.success('Nickname updated!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update nickname');
    } finally {
      setSavingNickname(false);
    }
  };

  const handleEditMemberNickname = async (userId: string, currentNickname: string | null | undefined) => {
    const newNick = prompt('Enter nickname (leave empty to clear):', currentNickname || '');
    if (newNick === null) return;
    try {
      await organizationsAPI.updateMemberNickname(orgId, userId, newNick.trim() || null);
      await loadMembers();
      toast.success('Nickname updated!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update nickname');
    }
  };

  const copyInviteLink = () => {
    if (!organization) return;
    const link = `${window.location.origin}/organizations/join?org=${orgId}&code=${organization.invite_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied!');
  };

  if (loading || !organization) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold text-text-primary">{organization.name}</h1>
          <button onClick={copyInviteLink} className="text-sm text-text-muted hover:text-text-primary">
            Copy Invite Link
          </button>
        </div>
        <p className="text-text-muted mb-3">{organization.description}</p>

        {/* User info with nickname */}
        <div className="bg-bg-hover rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-text-disabled uppercase tracking-wide">Your Nickname</span>
                {editingNickname ? (
                  <form onSubmit={handleUpdateNickname} className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      placeholder="Enter nickname"
                      className="px-2 py-1 bg-bg-input border border-border-secondary text-text-primary rounded text-sm w-32"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={savingNickname}
                      className="px-2 py-1 bg-btn-primary text-text-primary text-xs rounded hover:bg-btn-primary-hover disabled:opacity-50"
                    >
                      {savingNickname ? '...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNickname(false);
                        setNewNickname(organization.user_nickname || '');
                      }}
                      className="px-2 py-1 text-text-muted text-xs hover:text-text-primary"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-text-primary text-sm">
                      {organization.user_nickname || <span className="text-text-disabled italic">Not set</span>}
                    </span>
                    <button
                      onClick={() => {
                        setNewNickname(organization.user_nickname || '');
                        setEditingNickname(true);
                      }}
                      className="text-xs text-text-muted hover:text-text-primary"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              <div className="border-l border-border-secondary pl-4">
                <span className="text-xs text-text-disabled uppercase tracking-wide">Balance</span>
                <p className="text-text-primary font-medium">{organization.user_token_balance.toFixed(0)} tokens</p>
              </div>
            </div>
            {organization.user_is_admin && (
              <span className="px-2 py-1 bg-accent-purple/20 text-accent-purple text-xs font-medium rounded">
                Admin
              </span>
            )}
          </div>
        </div>

        <div className="flex space-x-4 text-sm text-text-disabled">
          <span>{organization.member_count} members</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-secondary mb-6">
        <div className="flex space-x-6">
          {(['bets', 'leaderboard'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'border-b-2 border-text-primary text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
          {organization?.user_is_admin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === 'admin'
                  ? 'border-b-2 border-text-primary text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Admin
            </button>
          )}
        </div>
      </div>

      {/* Bets Tab */}
      {activeTab === 'bets' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-text-primary">Pool Bets</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-btn-primary text-text-primary text-sm font-medium rounded-lg hover:bg-btn-primary-hover transition"
            >
              + Create Bet
            </button>
          </div>

          {bets.length === 0 ? (
            <p className="text-text-muted text-center py-16">No bets yet. Create one to get started!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bets.map((bet) => (
                <BetCard
                  key={bet.id}
                  bet={bet}
                  onClick={() => router.push(`/organizations/${orgId}/bets/${bet.id}`)}
                />
              ))}
            </div>
          )}

        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div>
          <h2 className="text-lg font-medium text-text-primary mb-4">Leaderboard</h2>
          {leaderboard.length > 0 ? (
            <div className="bg-bg-card rounded-lg border border-border-primary overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-bg-hover">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-text-disabled">#</th>
                    <th className="px-4 py-2 text-left text-xs text-text-disabled">Name</th>
                    <th className="px-4 py-2 text-left text-xs text-text-disabled">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.user_id} className="border-t border-border-secondary">
                      <td className="px-4 py-2 text-text-primary font-bold">{entry.rank}</td>
                      <td className="px-4 py-2 text-text-primary">{entry.name}</td>
                      <td className="px-4 py-2 text-text-primary">{entry.token_balance.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-text-muted text-center py-8">No members yet.</p>
          )}
        </div>
      )}

      {/* Admin Tab */}
      {activeTab === 'admin' && organization?.user_is_admin && (
        <div>
          <h2 className="text-lg font-medium text-text-primary mb-4">Manage Members</h2>
          <div className="bg-bg-card rounded-lg border border-border-primary overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-bg-hover">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-text-disabled">Name</th>
                  <th className="px-4 py-2 text-left text-xs text-text-disabled">Nickname</th>
                  <th className="px-4 py-2 text-left text-xs text-text-disabled">Email</th>
                  <th className="px-4 py-2 text-left text-xs text-text-disabled">Balance</th>
                  <th className="px-4 py-2 text-left text-xs text-text-disabled">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-t border-border-secondary">
                    <td className="px-4 py-2 text-text-primary">
                      {member.user_name}
                      {member.is_admin && (
                        <span className="ml-2 px-1.5 py-0.5 bg-accent-purple/20 text-accent-purple text-xs rounded">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-text-secondary text-sm">
                      {member.nickname || <span className="text-text-disabled italic">-</span>}
                    </td>
                    <td className="px-4 py-2 text-text-muted text-sm">{member.user_email}</td>
                    <td className="px-4 py-2 text-text-primary">{member.token_balance.toFixed(0)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEditMemberNickname(member.user_id, member.nickname)}
                          className="text-sm text-text-muted hover:text-text-primary"
                        >
                          Edit Nickname
                        </button>
                        <button
                          onClick={() => handleEditBalance(member.user_id, member.token_balance)}
                          className="text-sm text-text-muted hover:text-text-primary"
                        >
                          Edit Balance
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Bet Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="bg-bg-card rounded-xl border border-border-primary w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-border-secondary">
              <h2 className="text-lg font-semibold text-text-primary">Create a Bet</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text-primary text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBet} className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Question</label>
                <input
                  type="text"
                  value={betTitle}
                  onChange={(e) => setBetTitle(e.target.value)}
                  placeholder="What are you betting on?"
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm focus:ring-2 focus:ring-border-secondary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">Description <span className="text-text-disabled">(optional)</span></label>
                <textarea
                  value={betDescription}
                  onChange={(e) => setBetDescription(e.target.value)}
                  placeholder="Resolution criteria or context"
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Bet type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBetType('fixed')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                      betType === 'fixed'
                        ? 'bg-accent-purple text-text-primary'
                        : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'
                    }`}
                  >
                    Fixed fee
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetType('variable')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                      betType === 'variable'
                        ? 'bg-accent-purple text-text-primary'
                        : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'
                    }`}
                  >
                    Variable
                  </button>
                </div>
                <p className="text-xs text-text-disabled mt-1">
                  {betType === 'fixed' ? 'Everyone pays the same entry fee' : 'Participants choose their own bet amount'}
                </p>
              </div>

              {betType === 'fixed' ? (
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Entry fee (tokens)</label>
                  <input
                    type="number"
                    value={fixedFee}
                    onChange={(e) => setFixedFee(Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Min bet</label>
                    <input
                      type="number"
                      value={minFee}
                      onChange={(e) => setMinFee(Number(e.target.value))}
                      min="1"
                      className="w-full px-2 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Seed YES</label>
                    <input
                      type="number"
                      value={seedYes}
                      onChange={(e) => setSeedYes(Number(e.target.value))}
                      min="1"
                      className="w-full px-2 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Seed NO</label>
                    <input
                      type="number"
                      value={seedNo}
                      onChange={(e) => setSeedNo(Number(e.target.value))}
                      min="1"
                      className="w-full px-2 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {createError && <p className="text-sm text-red-400">{createError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-2.5 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover disabled:opacity-50 transition"
                >
                  {createLoading ? 'Creating...' : 'Create Bet'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 border border-border-secondary text-text-muted rounded-lg hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// MarketCard-style bet card
function BetCard({ bet, onClick }: { bet: PoolBet; onClick: () => void }) {
  const totalCount = bet.yes_count + bet.no_count;
  const yesPct = totalCount > 0 ? (bet.yes_count / totalCount) * 100 : 50;

  return (
    <div
      onClick={onClick}
      className="bg-bg-card rounded-lg shadow hover:shadow-lg transition-all border border-border-primary hover:border-border-secondary p-5 cursor-pointer"
    >
      {/* Status */}
      <div className="flex justify-between items-center mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
          bet.status === 'open'
            ? 'bg-green-900/30 text-green-400'
            : bet.status === 'locked'
            ? 'bg-yellow-900/30 text-yellow-400'
            : 'bg-gray-700 text-gray-300'
        }`}>
          {bet.status === 'open' ? '● Open' : bet.status === 'locked' ? '⬡ Locked' : `✓ ${bet.resolved_outcome}`}
        </span>
        <span className="text-xs text-text-disabled">
          {bet.bet_type === 'fixed' ? `${bet.fixed_fee} tokens` : `min ${bet.min_fee}`}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-text-primary mb-4 line-clamp-2">{bet.title}</h3>

      {/* YES / NO distribution rows */}
      <div className="space-y-2 mb-3">
        {[
          { label: 'YES', pct: yesPct, color: 'bg-green-500', text: 'text-green-400' },
          { label: 'NO',  pct: 100 - yesPct, color: 'bg-red-500', text: 'text-red-400' },
        ].map(({ label, pct, color, text }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`text-xs font-bold w-6 shrink-0 ${text}`}>{label}</span>
            <div className="flex-1 h-2 bg-bg-hover rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: totalCount > 0 ? `${pct}%` : '50%' }}
              />
            </div>
            <span className={`text-xs font-medium w-8 text-right shrink-0 ${text}`}>
              {totalCount > 0 ? `${Math.round(pct)}%` : '—'}
            </span>
          </div>
        ))}
      </div>

      {bet.user_bet && (
        <p className="text-xs text-text-disabled mt-2">
          You: <span className={bet.user_bet.side === 'YES' ? 'text-green-400' : 'text-red-400'}>{bet.user_bet.side}</span>
          {' '}({bet.user_bet.amount} tokens)
        </p>
      )}
    </div>
  );
}
