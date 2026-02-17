'use client';

import { useState, useEffect } from 'react';
import { marketsAPI, marketIdeasAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import Link from 'next/link';
import MarketCard from '@/components/MarketCard';
import type { Market, User } from '@/types';

export default function HomePage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);

  // Market idea form state
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [ideaSuccess, setIdeaSuccess] = useState('');
  const [ideaError, setIdeaError] = useState('');

  useEffect(() => {
    loadMarkets();
    setUser(authStorage.getUser());
  }, []);

  const loadMarkets = async () => {
    try {
      const data = await marketsAPI.list('active');
      setMarkets(data);
    } catch (err: any) {
      setError('Failed to load markets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdeaError('');
    setIdeaSuccess('');
    setIdeaLoading(true);

    try {
      await marketIdeasAPI.submit(ideaTitle, ideaDescription);
      setIdeaSuccess('Your market idea has been submitted for review!');
      setIdeaTitle('');
      setIdeaDescription('');
      setTimeout(() => {
        setShowIdeaForm(false);
        setIdeaSuccess('');
      }, 2000);
    } catch (err: any) {
      setIdeaError(err.response?.data?.detail || 'Failed to submit idea');
    } finally {
      setIdeaLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Introduction */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-3">What is Bearmarket?</h1>
        <p className="text-text-secondary mb-3">
          Bearmarket is a free prediction market platform made for Berkeley where you can trade on the outcomes of future events.
        </p>
        <p className="text-text-muted text-sm mb-3">
          Buy <span className="text-green-400 font-medium">YES</span> shares if you think something will happen, or <span className="text-red-400 font-medium">NO</span> if you don't. Prices reflect the crowd's probability—if YES trades at 70¢, the market thinks there's a 70% chance. When the event resolves, winning shares pay $1 each. You can also sell shares you own.
        </p>
        <p className="text-text-muted text-sm">
          Want private markets with friends or your club? Check out <Link href="/organizations" className="text-text-secondary hover:text-text-primary underline">Organizations</Link>.{' '}
          <Link href="/about" className="text-text-secondary hover:text-text-primary underline">Learn more</Link> about how it works{user && (
            <>, or <button onClick={() => setShowIdeaForm(!showIdeaForm)} className="text-text-secondary hover:text-text-primary underline">{showIdeaForm ? 'cancel' : 'suggest a market'}</button></>
          )}.
        </p>
      </div>

      {/* Market Idea Form */}
      {showIdeaForm && user && (
        <div className="mb-8 bg-bg-card rounded-lg shadow-lg border border-border-primary p-6">
          <h2 className="text-xl font-bold text-text-primary mb-4">Suggest a New Market</h2>
          <p className="text-text-muted mb-4">
            Have an idea for a prediction market? Submit it here and our team will review it.
          </p>

          <form onSubmit={handleSubmitIdea} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Market Title
              </label>
              <input
                type="text"
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
                placeholder="e.g., Will the new student center open by Fall 2025?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Description & Resolution Criteria
              </label>
              <textarea
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
                className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
                rows={4}
                placeholder="Describe your market idea and how it should be resolved..."
                required
              />
            </div>

            {ideaError && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                <p className="text-sm text-red-400">{ideaError}</p>
              </div>
            )}

            {ideaSuccess && (
              <div className="bg-green-900/50 border border-green-700 rounded-lg p-3">
                <p className="text-sm text-green-400">{ideaSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={ideaLoading}
              className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover disabled:bg-btn-secondary disabled:text-text-disabled transition"
            >
              {ideaLoading ? 'Submitting...' : 'Submit Idea'}
            </button>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
          <p className="mt-4 text-text-muted">Loading markets...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Markets Grid */}
      {!loading && !error && (
        <>
          {markets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-bg-card rounded-lg shadow-lg border border-border-primary">
              <p className="text-text-muted text-lg">No active markets yet.</p>
              <p className="text-text-disabled mt-2">Check back soon!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
