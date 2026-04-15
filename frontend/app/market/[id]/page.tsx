'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { marketsAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import OrderBook from '@/components/OrderBook';
import TradeInterface from '@/components/TradeInterface';
import ActiveLimitOrders from '@/components/ActiveLimitOrders';
import PriceChart from '@/components/PriceChart';
import OrderBookTooltip from '@/components/OrderBookTooltip';
import type { Market, User, MarketComment } from '@/types';

function CommentsSection({ marketId, user }: { marketId: string; user: User | null }) {
  const [comments, setComments] = useState<MarketComment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<MarketComment | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    marketsAPI.getComments(marketId).then(setComments).catch(() => {});
  }, [marketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const comment = await marketsAPI.postComment(marketId, text.trim(), replyTo?.id);
      setComments((prev) => [...prev, comment]);
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
    if (!user) return;
    try {
      const result = await marketsAPI.likeComment(marketId, commentId);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, liked_by_user: result.liked, like_count: result.like_count }
            : c
        )
      );
    } catch {}
  };

  const handleReply = (comment: MarketComment) => {
    setReplyTo(comment);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const topLevel = comments.filter((c) => !c.reply_to_id);
  const replies = comments.filter((c) => !!c.reply_to_id);
  const repliesFor = (id: string) => replies.filter((r) => r.reply_to_id === id);

  const CommentCard = ({ c, indent = false }: { c: MarketComment; indent?: boolean }) => (
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
        {user && (
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
      <h2 className="text-xl font-bold text-text-primary mb-4">Discussion</h2>

      {topLevel.length === 0 ? (
        <p className="text-text-disabled text-sm text-center py-4 mb-4">
          No comments yet — be the first!
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

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-text-disabled bg-bg-input px-3 py-1.5 rounded-lg">
              <span>Replying to <span className="text-text-muted font-medium">{replyTo.user_name}</span></span>
              <button type="button" onClick={() => setReplyTo(null)} className="ml-auto hover:text-text-muted">✕</button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.user_name}...` : 'Share your thoughts...'}
            rows={2}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm resize-none focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
          />
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
          Sign in to comment
        </p>
      )}
    </div>
  );
}

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [limitOrdersTick, setLimitOrdersTick] = useState(0);

  useEffect(() => {
    loadMarket();
    setUser(authStorage.getUser());
  }, [marketId]);

  const loadMarket = async () => {
    try {
      const data = await marketsAPI.get(marketId);
      setMarket(data);
    } catch (err: any) {
      setError('Failed to load market');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
          <p className="mt-4 text-text-muted">Loading market...</p>
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
          <p className="text-red-400">{error || 'Market not found'}</p>
        </div>
      </div>
    );
  }

  const yesPrice = (market.current_yes_price * 100).toFixed(1);
  const noPrice = (market.current_no_price * 100).toFixed(1);
  const isAdmin = user?.is_admin ?? false;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st'
      : day === 2 || day === 22 ? 'nd'
      : day === 3 || day === 23 ? 'rd' : 'th';
    return `${month} ${day}${suffix}, ${year}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Market Overview & Price History */}
        <div className="lg:col-span-2">
          {/* Market Overview */}
          <h1 className="text-3xl font-bold text-text-primary mb-4">{market.title}</h1>
          <p className="text-text-muted mb-6">{market.description}</p>

          {/* Current Prices — hover YES/NO for bid/ask */}
          <div className="grid grid-cols-2 gap-6 max-w-md mb-6 overflow-visible">
            <OrderBookTooltip market={market} side="YES" keyboardFocus>
              <div className="bg-pred-yes-surface rounded-lg p-4 border-2 border-pred-yes-ring">
                <p className="text-sm text-pred-yes font-medium mb-1">YES</p>
                <p className="text-4xl font-bold text-pred-yes">{yesPrice}¢</p>
              </div>
            </OrderBookTooltip>
            <OrderBookTooltip market={market} side="NO" keyboardFocus>
              <div className="bg-pred-no-surface rounded-lg p-4 border-2 border-pred-no-ring">
                <p className="text-sm text-pred-no font-medium mb-1">NO</p>
                <p className="text-4xl font-bold text-pred-no">{noPrice}¢</p>
              </div>
            </OrderBookTooltip>
          </div>

          {/* Market Info */}
          <div className="flex space-x-6 text-sm text-text-disabled mb-8">
            <span>Volume: ${market.total_volume.toFixed(0)}</span>
            <span>Closes: {formatDate(market.resolution_date)}</span>
            <span className={market.status === 'active' ? 'text-success' : 'text-text-disabled'}>
              {market.status === 'active' ? '● Active' : '○ Resolved'}
            </span>
          </div>

          <div className="mb-8">
            <PriceChart marketId={marketId} />
          </div>

          {/* Comments */}
          <div className="mb-8">
            <CommentsSection marketId={marketId} user={user} />
          </div>

          {/* Orderbook - Admin Only */}
          {isAdmin && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-text-primary mb-4">Orderbook (Admin View)</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <OrderBook marketId={marketId} side="YES" />
                </div>
                <div>
                  <OrderBook marketId={marketId} side="NO" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column - open orders & place order */}
        <div className="lg:col-span-1 space-y-6">
          <ActiveLimitOrders
            marketId={marketId}
            refreshKey={limitOrdersTick}
          />
          <TradeInterface
            marketId={marketId}
            onOrderPlaced={() => {
              loadMarket();
              setLimitOrdersTick((t) => t + 1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
