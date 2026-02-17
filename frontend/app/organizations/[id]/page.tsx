'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const [showCreateBet, setShowCreateBet] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Create bet form
  const [betTitle, setBetTitle] = useState('');
  const [betDescription, setBetDescription] = useState('');
  const [betType, setBetType] = useState<'fixed' | 'variable'>('fixed');
  const [fixedFee, setFixedFee] = useState(10);
  const [minFee, setMinFee] = useState(5);
  const [seedYes, setSeedYes] = useState(10);
  const [seedNo, setSeedNo] = useState(10);
  const [error, setError] = useState('');

  // Join bet state
  const [joiningBetId, setJoiningBetId] = useState<string | null>(null);
  const [joinSide, setJoinSide] = useState<'YES' | 'NO'>('YES');
  const [joinAmount, setJoinAmount] = useState(10);

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUserId(user.id);
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
      const user = authStorage.getUser();
      const currentMember = data.find((m: OrganizationMember) => m.user_id === user?.id);
      setIsAdmin(currentMember?.is_admin || false);
    } catch (err) {
      console.error('Failed to load members', err);
    }
  };

  const handleCreateBet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await organizationsAPI.createBet(orgId, betTitle, betDescription, betType, {
        fixedFee: betType === 'fixed' ? fixedFee : undefined,
        minFee: betType === 'variable' ? minFee : undefined,
        seedYes: betType === 'variable' ? seedYes : undefined,
        seedNo: betType === 'variable' ? seedNo : undefined,
      });
      setShowCreateBet(false);
      setBetTitle('');
      setBetDescription('');
      await loadBets();
      await loadOrganization();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create bet');
    }
  };

  const handleJoinBet = async (betId: string) => {
    try {
      const bet = bets.find(b => b.id === betId);
      await organizationsAPI.joinBet(orgId, betId, joinSide, bet?.bet_type === 'variable' ? joinAmount : undefined);
      setJoiningBetId(null);
      await loadBets();
      await loadOrganization();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to join bet');
    }
  };

  const handleLockBet = async (betId: string) => {
    try {
      await organizationsAPI.lockBet(orgId, betId);
      await loadBets();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to lock bet');
    }
  };

  const handleResolveBet = async (betId: string, outcome: 'YES' | 'NO') => {
    if (!confirm(`Resolve this bet as ${outcome}?`)) return;
    try {
      await organizationsAPI.resolveBet(orgId, betId, outcome);
      await loadBets();
      await loadOrganization();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resolve bet');
    }
  };

  const handleUndoBet = async (betId: string) => {
    if (!confirm('Undo this resolution and refund everyone?')) return;
    try {
      await organizationsAPI.undoBet(orgId, betId);
      await loadBets();
      await loadOrganization();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to undo bet');
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

  const copyInviteLink = () => {
    if (!organization) return;
    const link = `${window.location.origin}/organizations/join?org=${orgId}&code=${organization.invite_code}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied!');
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
      <div className="mb-8">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold text-text-primary">{organization.name}</h1>
          <button onClick={copyInviteLink} className="text-sm text-text-muted hover:text-text-primary">
            Copy Invite Link
          </button>
        </div>
        <p className="text-text-muted mb-3">{organization.description}</p>
        <div className="flex space-x-4 text-sm text-text-disabled">
          <span>{organization.member_count} members</span>
          <span className="text-text-primary font-medium">{organization.user_token_balance.toFixed(0)} tokens</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-secondary mb-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('bets')}
            className={`pb-3 text-sm font-medium transition ${activeTab === 'bets' ? 'border-b-2 border-text-primary text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Bets
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`pb-3 text-sm font-medium transition ${activeTab === 'leaderboard' ? 'border-b-2 border-text-primary text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            Leaderboard
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`pb-3 text-sm font-medium transition ${activeTab === 'admin' ? 'border-b-2 border-text-primary text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Admin
            </button>
          )}
        </div>
      </div>

      {/* Bets Tab */}
      {activeTab === 'bets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-text-primary">Pool Bets</h2>
            <button
              onClick={() => setShowCreateBet(!showCreateBet)}
              className="text-sm text-text-muted hover:text-text-primary"
            >
              {showCreateBet ? 'Cancel' : '+ Create Bet'}
            </button>
          </div>

          {/* Create Bet Form */}
          {showCreateBet && (
            <div className="bg-bg-card rounded-lg border border-border-primary p-4 mb-6">
              <form onSubmit={handleCreateBet} className="space-y-3">
                <input
                  type="text"
                  value={betTitle}
                  onChange={(e) => setBetTitle(e.target.value)}
                  placeholder="What are you betting on?"
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary text-text-primary rounded text-sm"
                  required
                />
                <textarea
                  value={betDescription}
                  onChange={(e) => setBetDescription(e.target.value)}
                  placeholder="Description / resolution criteria"
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary text-text-primary rounded text-sm"
                  rows={2}
                />
                <div className="flex space-x-4">
                  <label className="flex items-center text-sm text-text-secondary">
                    <input type="radio" checked={betType === 'fixed'} onChange={() => setBetType('fixed')} className="mr-2" />
                    Fixed fee (everyone pays same)
                  </label>
                  <label className="flex items-center text-sm text-text-secondary">
                    <input type="radio" checked={betType === 'variable'} onChange={() => setBetType('variable')} className="mr-2" />
                    Variable (bet any amount)
                  </label>
                </div>
                {betType === 'fixed' ? (
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Entry fee</label>
                    <input type="number" value={fixedFee} onChange={(e) => setFixedFee(Number(e.target.value))} min="1" className="w-32 px-2 py-1 bg-bg-input border border-border-secondary text-text-primary rounded text-sm" />
                  </div>
                ) : (
                  <div className="flex space-x-4">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Min bet</label>
                      <input type="number" value={minFee} onChange={(e) => setMinFee(Number(e.target.value))} min="1" className="w-24 px-2 py-1 bg-bg-input border border-border-secondary text-text-primary rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Your seed (YES)</label>
                      <input type="number" value={seedYes} onChange={(e) => setSeedYes(Number(e.target.value))} min="1" className="w-24 px-2 py-1 bg-bg-input border border-border-secondary text-text-primary rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Your seed (NO)</label>
                      <input type="number" value={seedNo} onChange={(e) => setSeedNo(Number(e.target.value))} min="1" className="w-24 px-2 py-1 bg-bg-input border border-border-secondary text-text-primary rounded text-sm" />
                    </div>
                  </div>
                )}
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button type="submit" className="px-4 py-2 bg-btn-primary text-text-primary text-sm rounded hover:bg-btn-primary-hover">
                  Create Bet
                </button>
              </form>
            </div>
          )}

          {/* Bets List */}
          <div className="space-y-4">
            {bets.length === 0 ? (
              <p className="text-text-muted text-center py-8">No bets yet. Create one to get started!</p>
            ) : (
              bets.map((bet) => (
                <div key={bet.id} className="bg-bg-card rounded-lg border border-border-primary p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-text-primary">{bet.title}</h3>
                      {bet.description && <p className="text-sm text-text-muted">{bet.description}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${bet.status === 'open' ? 'bg-green-900/30 text-green-400' : bet.status === 'locked' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-700 text-gray-300'}`}>
                      {bet.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex space-x-6 text-sm mb-3">
                    <span className="text-green-400">YES: {bet.yes_pool.toFixed(0)} ({bet.yes_count})</span>
                    <span className="text-red-400">NO: {bet.no_pool.toFixed(0)} ({bet.no_count})</span>
                    <span className="text-text-muted">{bet.bet_type === 'fixed' ? `${bet.fixed_fee} per entry` : `min ${bet.min_fee}`}</span>
                  </div>

                  {bet.resolved_outcome && (
                    <p className="text-sm mb-3">Resolved: <span className={bet.resolved_outcome === 'YES' ? 'text-green-400' : 'text-red-400'}>{bet.resolved_outcome}</span></p>
                  )}

                  {bet.user_bet && (
                    <p className="text-sm text-text-muted mb-3">You bet {bet.user_bet.amount} on {bet.user_bet.side}</p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {bet.status === 'open' && !bet.user_bet && (
                      joiningBetId === bet.id ? (
                        <div className="flex items-center space-x-2">
                          <select value={joinSide} onChange={(e) => setJoinSide(e.target.value as 'YES' | 'NO')} className="px-2 py-1 bg-bg-input border border-border-secondary text-text-primary rounded text-sm">
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                          </select>
                          {bet.bet_type === 'variable' && (
                            <input type="number" value={joinAmount} onChange={(e) => setJoinAmount(Number(e.target.value))} min={bet.min_fee} className="w-20 px-2 py-1 bg-bg-input border border-border-secondary text-text-primary rounded text-sm" />
                          )}
                          <button onClick={() => handleJoinBet(bet.id)} className="px-3 py-1 bg-btn-primary text-text-primary text-sm rounded">Confirm</button>
                          <button onClick={() => setJoiningBetId(null)} className="text-sm text-text-muted">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setJoiningBetId(bet.id)} className="px-3 py-1 bg-btn-primary text-text-primary text-sm rounded">Join Bet</button>
                      )
                    )}

                    {bet.created_by === currentUserId && bet.status === 'open' && (
                      <button onClick={() => handleLockBet(bet.id)} className="px-3 py-1 border border-border-secondary text-text-muted text-sm rounded hover:text-text-primary">Lock</button>
                    )}

                    {bet.created_by === currentUserId && (bet.status === 'open' || bet.status === 'locked') && (
                      <>
                        <button onClick={() => handleResolveBet(bet.id, 'YES')} className="px-3 py-1 border border-green-700 text-green-400 text-sm rounded hover:bg-green-900/30">Resolve YES</button>
                        <button onClick={() => handleResolveBet(bet.id, 'NO')} className="px-3 py-1 border border-red-700 text-red-400 text-sm rounded hover:bg-red-900/30">Resolve NO</button>
                      </>
                    )}

                    {isAdmin && bet.status === 'resolved' && (
                      <button onClick={() => handleUndoBet(bet.id)} className="px-3 py-1 border border-border-secondary text-text-muted text-sm rounded hover:text-text-primary">Undo Resolution</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
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
      {activeTab === 'admin' && isAdmin && (
        <div>
          <h2 className="text-lg font-medium text-text-primary mb-4">Manage Members</h2>
          <div className="bg-bg-card rounded-lg border border-border-primary overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-bg-hover">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-text-disabled">Name</th>
                  <th className="px-4 py-2 text-left text-xs text-text-disabled">Email</th>
                  <th className="px-4 py-2 text-left text-xs text-text-disabled">Balance</th>
                  <th className="px-4 py-2 text-left text-xs text-text-disabled">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-t border-border-secondary">
                    <td className="px-4 py-2 text-text-primary">{member.user_name}</td>
                    <td className="px-4 py-2 text-text-muted text-sm">{member.user_email}</td>
                    <td className="px-4 py-2 text-text-primary">{member.token_balance.toFixed(0)}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleEditBalance(member.user_id, member.token_balance)}
                        className="text-sm text-text-muted hover:text-text-primary"
                      >
                        Edit Balance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
