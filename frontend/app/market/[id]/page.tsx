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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    marketsAPI.getComments(marketId).then(setComments).catch(() => {});
  }, [marketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const comment = await marketsAPI.postComment(marketId, text.trim());
      setComments((prev) => [...prev, comment]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-4">Discussion</h2>

      {comments.length === 0 ? (
        <p className="text-text-disabled text-sm text-center py-4 mb-4">
          No comments yet — be the first!
        </p>
      ) : (
        <div className="space-y-4 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <span className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded h-fit mt-0.5 ${
                c.user_side === 'YES'
                  ? 'bg-emerald-900/40 text-emerald-400'
                  : 'bg-rose-900/40 text-rose-400'
              }`}>
                {c.user_side}
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-text-primary">{c.user_name}</span>
                  <span className="text-xs text-text-disabled">{fmt(c.created_at)}</span>
                </div>
                <p className="text-sm text-text-muted mt-0.5 break-words">{c.text}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts..."
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
              <div className="bg-green-900/30 rounded-lg p-4 border-2 border-green-700/50">
                <p className="text-sm text-green-400 font-medium mb-1">YES</p>
                <p className="text-4xl font-bold text-green-400">{yesPrice}¢</p>
              </div>
            </OrderBookTooltip>
            <OrderBookTooltip market={market} side="NO" keyboardFocus>
              <div className="bg-red-900/30 rounded-lg p-4 border-2 border-red-700/50">
                <p className="text-sm text-red-400 font-medium mb-1">NO</p>
                <p className="text-4xl font-bold text-red-400">{noPrice}¢</p>
              </div>
            </OrderBookTooltip>
          </div>

          {/* Market Info */}
          <div className="flex space-x-6 text-sm text-text-disabled mb-8">
            <span>Volume: ${market.total_volume.toFixed(0)}</span>
            <span>Closes: {formatDate(market.resolution_date)}</span>
            <span className={market.status === 'active' ? 'text-green-400' : 'text-text-disabled'}>
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
