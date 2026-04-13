'use client';

import { useState, useEffect } from 'react';
import { marketIdeasAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import AuthModal from '@/components/AuthModal';
import type { MarketIdea, User } from '@/types';

export default function SuggestPage() {
  const [ideas, setIdeas] = useState<MarketIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Voting state
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    setUser(authStorage.getUser());
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    try {
      const currentUser = authStorage.getUser();
      let data;
      if (currentUser) {
        data = await marketIdeasAPI.listPublicAuth(1, 100);
      } else {
        data = await marketIdeasAPI.listPublic(1, 100);
      }
      setIdeas(data.ideas);
    } catch (err: any) {
      setError('Failed to load suggested markets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const newIdea = await marketIdeasAPI.submit(ideaTitle, ideaDescription);
      setFormSuccess('Your market idea has been submitted!');
      setIdeaTitle('');
      setIdeaDescription('');
      // Add new idea to the list
      setIdeas([newIdea, ...ideas]);
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess('');
      }, 2000);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to submit idea');
    } finally {
      setFormLoading(false);
    }
  };

  const handleVote = async (ideaId: string, vote: 'like' | 'dislike') => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setVotingId(ideaId);
    try {
      const idea = ideas.find(i => i.id === ideaId);

      // If user already voted the same way, remove the vote
      if (idea?.user_vote === vote) {
        const result = await marketIdeasAPI.removeVote(ideaId);
        setIdeas(ideas.map(i =>
          i.id === ideaId
            ? { ...i, like_count: result.like_count, dislike_count: result.dislike_count, user_vote: null }
            : i
        ));
      } else {
        // Otherwise, cast the vote
        const result = await marketIdeasAPI.vote(ideaId, vote);
        setIdeas(ideas.map(i =>
          i.id === ideaId
            ? { ...i, like_count: result.like_count, dislike_count: result.dislike_count, user_vote: vote }
            : i
        ));
      }
    } catch (err: any) {
      console.error('Failed to vote:', err);
    } finally {
      setVotingId(null);
    }
  };

  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser);
    setShowAuthModal(false);
    // Reload ideas to get user's votes
    loadIdeas();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-900/50 text-green-400 border border-green-700">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-900/50 text-red-400 border border-red-700">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-900/50 text-yellow-400 border border-yellow-700">Pending</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Suggest a Market</h1>
        <p className="text-text-secondary mb-3">
          Got an idea for a prediction market? Submit it here and vote on others' ideas.
          Popular suggestions may become real markets!
        </p>
        {user ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-text-secondary hover:text-text-primary underline font-medium transition"
          >
            {showForm ? 'Cancel' : 'Submit a new idea'}
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-text-secondary hover:text-text-primary underline font-medium transition"
          >
            Sign in to suggest a market
          </button>
        )}
      </div>

      {/* Submit Form */}
      {showForm && user && (
        <div className="mb-8 bg-bg-card rounded-lg shadow-lg border border-border-primary p-6">
          <h2 className="text-xl font-medium text-text-primary mb-4">Submit Your Idea</h2>

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

            {formError && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                <p className="text-sm text-red-400">{formError}</p>
              </div>
            )}

            {formSuccess && (
              <div className="bg-green-900/50 border border-green-700 rounded-lg p-3">
                <p className="text-sm text-green-400">{formSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={formLoading}
              className="text-text-primary font-medium hover:text-blue-500 disabled:text-text-disabled transition cursor-pointer"
            >
              {formLoading ? 'Submitting...' : 'Submit Idea'}
            </button>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
          <p className="mt-4 text-text-muted">Loading suggestions...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Ideas List */}
      {!loading && !error && (
        <>
          <h2 className="text-lg font-medium text-text-primary mb-4">
            Suggested Markets ({ideas.length})
          </h2>

          {ideas.length > 0 ? (
            <div className="space-y-4">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Voting buttons */}
                    <div className="flex flex-col items-center gap-1 min-w-[50px]">
                      <button
                        onClick={() => handleVote(idea.id, 'like')}
                        disabled={votingId === idea.id}
                        className={`p-2 rounded-lg transition ${
                          idea.user_vote === 'like'
                            ? 'bg-green-900/50 text-green-400'
                            : 'hover:bg-bg-hover text-text-muted hover:text-green-400'
                        } disabled:opacity-50`}
                        title="Like this idea"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                      </button>
                      <span className={`text-sm font-medium ${idea.like_count > idea.dislike_count ? 'text-green-400' : idea.dislike_count > idea.like_count ? 'text-red-400' : 'text-text-muted'}`}>
                        {idea.like_count - idea.dislike_count}
                      </span>
                      <button
                        onClick={() => handleVote(idea.id, 'dislike')}
                        disabled={votingId === idea.id}
                        className={`p-2 rounded-lg transition ${
                          idea.user_vote === 'dislike'
                            ? 'bg-red-900/50 text-red-400'
                            : 'hover:bg-bg-hover text-text-muted hover:text-red-400'
                        } disabled:opacity-50`}
                        title="Dislike this idea"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-text-primary font-medium">{idea.title}</h3>
                        {getStatusBadge(idea.status)}
                      </div>
                      <p className="text-text-secondary text-sm mb-3">{idea.description}</p>
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        <span>by {idea.user_name}</span>
                        <span>{formatDate(idea.created_at)}</span>
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          {idea.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                          {idea.dislike_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-bg-card rounded-lg shadow-lg border border-border-primary">
              <p className="text-text-muted text-lg">No suggestions yet.</p>
              <p className="text-text-disabled mt-2">Be the first to suggest a market!</p>
            </div>
          )}
        </>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
