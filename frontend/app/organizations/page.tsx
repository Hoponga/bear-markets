'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { organizationsAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { Organization } from '@/types';

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialTokens, setInitialTokens] = useState(1000);
  const [error, setError] = useState('');

  // Join form state
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    const user = authStorage.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const data = await organizationsAPI.list();
      setOrganizations(data);
    } catch (err) {
      console.error('Failed to load organizations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const org = await organizationsAPI.create(name, description, initialTokens);
      setShowCreateForm(false);
      setName('');
      setDescription('');
      setInitialTokens(1000);
      await loadOrganizations();
      router.push(`/organizations/${org.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create organization');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Parse invite link or code
      const code = inviteCode.includes('invite=')
        ? inviteCode.split('invite=')[1].split('&')[0]
        : inviteCode;

      const parts = code.split('/');
      const orgId = parts[0];
      const actualCode = parts[1] || parts[0];

      await organizationsAPI.join(orgId, actualCode);
      setShowJoinForm(false);
      setInviteCode('');
      await loadOrganizations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid invite link');
    }
  };

  if (loading) {
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
        <h1 className="text-4xl font-bold text-text-primary mb-2">Organizations</h1>
        <p className="text-lg text-text-muted">
          Create or join organizations to trade with your team
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-6 py-3 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover transition"
        >
          + Create Organization
        </button>
        <button
          onClick={() => setShowJoinForm(!showJoinForm)}
          className="px-6 py-3 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover transition"
        >
          Join with Invite
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Create Organization</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
                placeholder="e.g., Berkeley Startups"
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
                className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
                rows={3}
                placeholder="What is this organization for?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Initial Token Balance (per member)
              </label>
              <input
                type="number"
                value={initialTokens}
                onChange={(e) => setInitialTokens(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent"
                min="100"
                max="100000"
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-btn-secondary text-text-secondary font-medium rounded-lg hover:bg-btn-secondary-hover"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join Form */}
      {showJoinForm && (
        <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Join Organization</h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Invite Link or Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
                placeholder="Paste invite link or code"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="px-6 py-2 bg-btn-secondary text-text-secondary font-medium rounded-lg hover:bg-btn-secondary-hover"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Organizations List */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          My Organizations ({organizations.length})
        </h2>

        {organizations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/organizations/${org.id}`}
                className="block bg-bg-card rounded-lg shadow-lg border border-border-primary p-6 hover:shadow-xl hover:border-border-secondary transition"
              >
                <h3 className="text-xl font-bold text-text-primary mb-2">{org.name}</h3>
                <p className="text-sm text-text-muted mb-4 line-clamp-2">
                  {org.description}
                </p>
                <div className="flex justify-between items-center text-sm text-text-disabled">
                  <span>{org.member_count} members</span>
                  <span>{org.initial_token_balance} tokens</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
            <p className="text-text-muted mb-4">
              You haven't created or joined any organizations yet.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover"
            >
              Create Your First Organization
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
