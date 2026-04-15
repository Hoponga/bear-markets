'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { organizationsAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { PoolBet, PoolBetEntry, BetComment } from '@/types';

// ─── Comments Section ─────────────────────────────────────────────────────────

function CommentsSection({
  orgId, betId, userBet, comments, onCommentsChange,
}: {
  orgId: string;
  betId: string;
  userBet: PoolBet['user_bet'];
  comments: BetComment[];
  onCommentsChange: (updater: (prev: BetComment[]) => BetComment[]) => void;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<BetComment | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const comment = await organizationsAPI.postComment(orgId, betId, text.trim(), replyTo?.id);
      onCommentsChange((prev) => [...prev, comment]);
      setText('');
      setReplyTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!userBet) return;
    try {
      const result = await organizationsAPI.likeComment(orgId, betId, commentId);
      onCommentsChange((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, liked_by_user: result.liked, like_count: result.like_count }
            : c
        )
      );
    } catch {}
  };

  const handleReply = (comment: BetComment) => {
    setReplyTo(comment);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const topLevel = comments.filter((c) => !c.reply_to_id);
  const replies = comments.filter((c) => !!c.reply_to_id);
  const repliesFor = (id: string) => replies.filter((r) => r.reply_to_id === id);

  const CommentCard = ({ c, indent = false }: { c: BetComment; indent?: boolean }) => (
    <div className={`flex gap-3 ${indent ? 'ml-8 mt-2' : ''}`}>
      <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded h-fit mt-0.5 ${
        c.user_side === 'YES'
          ? 'bg-pred-yes-surface text-pred-yes'
          : 'bg-pred-no-surface text-pred-no'
      }`}>
        {c.user_side}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-text-primary">{c.user_name}</span>
          <span className="text-xs text-text-disabled">{fmt(c.created_at)}</span>
        </div>
        <p className="text-sm text-text-muted mt-0.5 break-words">{c.text}</p>
        {userBet && (
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => handleLike(c.id)}
              className={`flex items-center gap-1 text-xs transition ${
                c.liked_by_user ? 'text-pred-yes' : 'text-text-disabled hover:text-text-muted'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill={c.liked_by_user ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
              </svg>
              {c.like_count > 0 && <span>{c.like_count}</span>}
            </button>
            {!indent && (
              <button
                onClick={() => handleReply(c)}
                className="text-xs text-text-disabled hover:text-text-muted transition"
              >
                Reply
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h3 className="text-lg font-semibold text-text-primary mb-4">Discussion</h3>

      {topLevel.length === 0 ? (
        <p className="text-text-disabled text-sm text-center py-4 mb-4">
          {userBet ? 'No comments yet — be the first!' : 'Place a bet to join the discussion.'}
        </p>
      ) : (
        <div className="space-y-4 mb-4">
          {topLevel.map((c) => (
            <div key={c.id}>
              <CommentCard c={c} />
              {repliesFor(c.id).map((r) => (
                <CommentCard key={r.id} c={r} indent />
              ))}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {userBet ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-text-disabled bg-bg-input px-3 py-1.5 rounded-lg">
              <span>Replying to <span className="text-text-muted font-medium">{replyTo.user_name}</span></span>
              <button type="button" onClick={() => setReplyTo(null)} className="ml-auto hover:text-text-muted">✕</button>
            </div>
          )}
          <div className="flex gap-2 items-start">
            <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded mt-1 ${
              userBet.side === 'YES' ? 'bg-pred-yes-surface text-pred-yes' : 'bg-pred-no-surface text-pred-no'
            }`}>
              {userBet.side}
            </span>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? `Reply to ${replyTo.user_name}...` : 'Share your reasoning...'}
              rows={2}
              className="flex-1 px-3 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm resize-none focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="px-4 py-2 bg-btn-primary text-text-primary text-sm font-medium rounded-lg hover:bg-btn-primary-hover disabled:bg-btn-secondary disabled:text-text-disabled transition"
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-text-disabled text-center border-t border-border-secondary pt-3">
          Place a bet to comment
        </p>
      )}
    </div>
  );
}

// ─── Join Bet Card (mirrors TradeInterface) ───────────────────────────────────

function BetForm({
  bet, orgId, isChanging, onDone,
}: {
  bet: PoolBet;
  orgId: string;
  isChanging: boolean;
  onDone: () => void;
}) {
  const [side, setSide] = useState<'YES' | 'NO'>(bet.user_bet?.side ?? 'YES');
  const [amount, setAmount] = useState(bet.user_bet?.amount ?? (bet.min_fee ?? bet.fixed_fee ?? 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const user = authStorage.getUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const fn = isChanging ? organizationsAPI.changeBet : organizationsAPI.joinBet;
      await fn(orgId, bet.id, side, bet.bet_type === 'variable' ? amount : undefined);
      setSuccess(isChanging ? 'Bet updated!' : `${side} bet placed!`);
      setTimeout(() => { setSuccess(''); onDone(); }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Side</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setSide('YES')}
            className={`py-2 px-4 rounded-lg font-medium transition ${side === 'YES' ? 'bg-pred-yes-btn text-white hover:bg-pred-yes-btn-hover' : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'}`}>
            YES
          </button>
          <button type="button" onClick={() => setSide('NO')}
            className={`py-2 px-4 rounded-lg font-medium transition ${side === 'NO' ? 'bg-pred-no-btn text-white hover:bg-pred-no-btn-hover' : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'}`}>
            NO
          </button>
        </div>
      </div>

      {bet.bet_type === 'variable' ? (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Amount (tokens)</label>
          <input
            type="number" min={bet.min_fee} step="1" value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
            required
          />
          <p className="text-xs text-text-disabled mt-1">Minimum {bet.min_fee} tokens</p>
        </div>
      ) : (
        <div className="bg-bg-hover rounded-lg p-3">
          <p className="text-sm text-text-secondary"><span className="font-medium">Entry fee:</span> {bet.fixed_fee} tokens</p>
        </div>
      )}

      {error && <div className="bg-red-900/50 border border-red-700 rounded-lg p-3"><p className="text-sm text-red-400">{error}</p></div>}
      {success && <div className="bg-green-900/50 border border-green-700 rounded-lg p-3"><p className="text-sm text-green-400">{success}</p></div>}

      <button type="submit" disabled={loading || !user}
        className="w-full py-3 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover disabled:bg-btn-secondary disabled:text-text-disabled transition">
        {loading ? (isChanging ? 'Updating...' : 'Placing...') : !user ? 'Sign In to Bet' : isChanging ? `Change to ${side}` : `Place ${side} Bet`}
      </button>
    </form>
  );
}

function JoinBetCard({ bet, orgId, onJoined }: { bet: PoolBet; orgId: string; onJoined: () => void }) {
  // Already have a bet — just display it
  if (bet.user_bet) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-3">Your Bet</h3>
        <p className={`text-4xl font-bold ${bet.user_bet.side === 'YES' ? 'text-pred-yes' : 'text-pred-no'}`}>
          {bet.user_bet.side} · {bet.user_bet.amount}
          <span className="text-sm font-normal text-text-disabled ml-2">tokens</span>
        </p>
        {bet.status !== 'open' && (
          <p className="text-text-muted text-sm mt-2">
            {bet.status === 'locked' ? 'Betting is locked.' : `Resolved ${bet.resolved_outcome}.`}
          </p>
        )}
      </div>
    );
  }

  // No bet + not open
  if (bet.status !== 'open') {
    return (
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Place Bet</h3>
        <p className="text-text-muted text-sm">
          {bet.status === 'locked' ? 'Betting is locked — no more entries.' : `Resolved ${bet.resolved_outcome}.`}
        </p>
      </div>
    );
  }

  // No bet + open — show form
  return (
    <div>
      <h3 className="text-lg font-semibold text-text-primary mb-4">Place Bet</h3>
      <BetForm bet={bet} orgId={orgId} isChanging={false} onDone={onJoined} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const betId = params.betId as string;

  const [bet, setBet] = useState<PoolBet | null>(null);
  const [entries, setEntries] = useState<PoolBetEntry[]>([]);
  const [comments, setComments] = useState<BetComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [changingBet, setChangingBet] = useState(false);

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user) { router.push('/'); return; }
    setCurrentUserId(user.id);
    organizationsAPI.getMembers(orgId).then((members: any[]) => {
      const me = members.find((m) => m.user_id === user.id);
      setIsOrgAdmin(me?.is_admin || false);
    });
    loadAll();
  }, [orgId, betId]);

  const loadAll = async () => {
    try {
      const [betData, entryData, commentData] = await Promise.all([
        organizationsAPI.getBet(orgId, betId),
        organizationsAPI.getBetEntries(orgId, betId),
        organizationsAPI.getComments(orgId, betId),
      ]);
      setBet(betData);
      setEntries(entryData);
      setComments(commentData);
    } catch {
      router.push(`/organizations/${orgId}`);
    } finally {
      setLoading(false);
    }
  };

  const reloadBet = async () => {
    const [betData, entryData] = await Promise.all([
      organizationsAPI.getBet(orgId, betId),
      organizationsAPI.getBetEntries(orgId, betId),
    ]);
    setBet(betData);
    setEntries(entryData);
  };

  const handleLock = async () => {
    try {
      await organizationsAPI.lockBet(orgId, betId);
      await reloadBet();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to lock bet');
    }
  };

  const handleResolve = async (outcome: 'YES' | 'NO') => {
    if (!confirm(`Resolve this bet as ${outcome}?`)) return;
    try {
      await organizationsAPI.resolveBet(orgId, betId, outcome);
      await reloadBet();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resolve bet');
    }
  };

  const handleUndo = async () => {
    if (!confirm('Undo this resolution and refund everyone?')) return;
    try {
      await organizationsAPI.undoBet(orgId, betId);
      await reloadBet();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to undo resolution');
    }
  };

  const handleToggleParticipants = async () => {
    try {
      await organizationsAPI.toggleParticipants(orgId, betId);
      await reloadBet();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update visibility');
    }
  };

  if (loading || !bet) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted" />
          <p className="mt-4 text-text-muted">Loading bet...</p>
        </div>
      </div>
    );
  }

  const isCreator = bet.created_by === currentUserId;
  const totalCount = bet.yes_count + bet.no_count;
  const yesPct = totalCount > 0 ? (bet.yes_count / totalCount) * 100 : 50;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
      : day === 2 || day === 22 ? 'nd'
      : day === 3 || day === 23 ? 'rd' : 'th';
    return `${month} ${day}${suffix}, ${date.getFullYear()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back */}
      <button
        onClick={() => router.push(`/organizations/${orgId}`)}
        className="text-sm text-text-muted hover:text-text-primary mb-6 flex items-center gap-1"
      >
        ← Back to group
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left column ── */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-text-primary mb-4">{bet.title}</h1>
          {bet.description && (
            <div className="mb-6">
              <span className="text-xs font-semibold text-text-disabled uppercase tracking-wide">Description</span>
              <p className="text-text-muted mt-1">{bet.description}</p>
            </div>
          )}

          {/* Bet info bar — mirroring market info bar */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-disabled mb-8">
            <span>Participants: {totalCount}</span>
            <span>{bet.bet_type === 'fixed' ? `${bet.fixed_fee} tokens/entry` : `min ${bet.min_fee} tokens`}</span>
            <span>Created: {formatDate(bet.created_at)}</span>
            <span className={
              bet.status === 'open' ? 'text-success'
              : bet.status === 'locked' ? 'text-yellow-400'
              : 'text-text-disabled'
            }>
              {bet.status === 'open' ? '● Open'
                : bet.status === 'locked' ? '⬡ Locked'
                : `✓ Resolved ${bet.resolved_outcome}`}
            </span>
          </div>

          {/* YES / NO distribution bars */}
          <div className="space-y-2 mb-8">
            {[
              { label: 'YES', pct: yesPct, color: 'bg-pred-yes-btn', text: 'text-pred-yes' },
              { label: 'NO',  pct: 100 - yesPct, color: 'bg-pred-no-btn', text: 'text-pred-no' },
            ].map(({ label, pct, color, text }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`text-sm font-bold w-7 shrink-0 ${text}`}>{label}</span>
                <div className="flex-1 h-2.5 bg-bg-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: totalCount > 0 ? `${pct}%` : '50%' }}
                  />
                </div>
                <span className={`text-sm font-medium w-10 text-right shrink-0 ${text}`}>
                  {totalCount > 0 ? `${Math.round(pct)}%` : '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Comments */}
          <CommentsSection
            orgId={orgId}
            betId={betId}
            userBet={bet.user_bet}
            comments={comments}
            onCommentsChange={setComments}
          />
        </div>

        {/* ── Right column ── */}
        <div className="lg:col-span-1 space-y-4">
          <JoinBetCard bet={bet} orgId={orgId} onJoined={reloadBet} />

          {/* Manage Bet card — shown to creator, admin, or anyone with a bet */}
          {(isCreator || isOrgAdmin || !!bet.user_bet) && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Manage Bet</h3>
              <div className="space-y-2">
                {/* Change bet — any participant while open */}
                {bet.user_bet && bet.status === 'open' && !changingBet && (
                  <button
                    onClick={() => setChangingBet(true)}
                    className="w-full py-2 border border-border-secondary text-text-muted text-sm rounded-lg hover:text-text-primary transition"
                  >
                    Change Bet
                  </button>
                )}
                {bet.user_bet && bet.status === 'open' && changingBet && (
                  <div>
                    <BetForm
                      bet={bet}
                      orgId={orgId}
                      isChanging={true}
                      onDone={() => { setChangingBet(false); reloadBet(); }}
                    />
                    <button
                      onClick={() => setChangingBet(false)}
                      className="w-full mt-2 py-1.5 text-xs text-text-muted hover:text-text-primary transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Creator controls */}
                {isCreator && bet.status === 'open' && (
                  <button
                    onClick={handleLock}
                    className="w-full py-2 border border-border-secondary text-text-muted text-sm rounded-lg hover:text-text-primary transition"
                  >
                    Lock Betting
                  </button>
                )}
                {isCreator && bet.status !== 'resolved' && (
                  <>
                    <button
                      onClick={() => handleResolve('YES')}
                      className="w-full py-2 border border-pred-yes-ring text-pred-yes text-sm rounded-lg hover:bg-pred-yes-surface transition"
                    >
                      Resolve YES
                    </button>
                    <button
                      onClick={() => handleResolve('NO')}
                      className="w-full py-2 border border-pred-no-ring text-pred-no text-sm rounded-lg hover:bg-pred-no-surface transition"
                    >
                      Resolve NO
                    </button>
                  </>
                )}
                {isOrgAdmin && bet.status === 'resolved' && (
                  <button
                    onClick={handleUndo}
                    className="w-full py-2 border border-border-secondary text-text-muted text-sm rounded-lg hover:text-text-primary transition"
                  >
                    Undo Resolution
                  </button>
                )}
                {isCreator && (
                  <button
                    onClick={handleToggleParticipants}
                    className={`w-full py-2 border text-sm rounded-lg transition ${
                      bet.participants_public
                        ? 'border-border-secondary text-text-muted hover:text-text-primary'
                        : 'border-blue-700 text-blue-400 hover:bg-blue-900/30'
                    }`}
                  >
                    Participants: {bet.participants_public ? 'Public' : 'Hidden'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Participants list */}
          {entries.length > 0 && (bet.participants_public || isCreator) && (
            <div>
              <div className="py-2 mb-1">
                <h3 className="text-sm font-semibold text-text-primary">Participants</h3>
              </div>
              <div className="divide-y divide-border-secondary max-h-64 overflow-y-auto">
                {entries.map((entry, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        entry.side === 'YES'
                          ? 'bg-pred-yes-surface text-pred-yes'
                          : 'bg-pred-no-surface text-pred-no'
                      }`}>
                        {entry.side}
                      </span>
                      <span className="text-sm text-text-primary">{entry.user_name}</span>
                    </div>
                    <span className="text-xs text-text-muted">{entry.amount} tokens</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
