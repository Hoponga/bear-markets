'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authAPI } from '@/lib/api';
import ActiveLimitOrders from '@/components/ActiveLimitOrders';
import { authStorage } from '@/lib/auth';
import type { User } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const storedUser = authStorage.getUser();
    if (!storedUser) {
      router.push('/');
      return;
    }
    setUser(storedUser);
    setNewName(storedUser.name);
    setLoading(false);
  }, [router]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const updatedUser = await authAPI.updateProfile(newName.trim());
      setUser(updatedUser);
      authStorage.setUser(updatedUser);
      setEditingName(false);
      toast.success('Name updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      await authAPI.deleteAccount();
      authStorage.logout();
      toast.success('Account deleted successfully');
      router.push('/');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-8">Profile Settings</h1>

      <div className="bg-bg-card rounded-lg border border-border-primary p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Account Information</h2>

        {/* Email (read-only) */}
        <div className="mb-4">
          <label className="block text-sm text-text-muted mb-1">Email</label>
          <p className="text-text-primary">{user.email}</p>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm text-text-muted mb-1">Name</label>
          {editingName ? (
            <form onSubmit={handleUpdateName} className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-3 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm focus:ring-2 focus:ring-border-secondary"
                autoFocus
              />
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-btn-primary text-text-primary text-sm font-medium rounded-lg hover:bg-btn-primary-hover disabled:opacity-50 transition"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingName(false);
                  setNewName(user.name);
                }}
                className="px-4 py-2 border border-border-secondary text-text-muted text-sm rounded-lg hover:text-text-primary transition"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-text-primary">{user.name}</p>
              <button
                onClick={() => setEditingName(true)}
                className="text-sm text-text-muted hover:text-text-primary transition"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Token Balance */}
        <div className="mb-4">
          <label className="block text-sm text-text-muted mb-1">Token Balance</label>
          <p className="text-text-primary font-medium">{user.token_balance.toFixed(2)} tokens</p>
        </div>

        {/* Admin Status */}
        {user.is_admin && (
          <div className="mb-4">
            <span className="inline-block px-2 py-1 bg-accent-purple/20 text-accent-purple text-xs font-medium rounded">
              Admin
            </span>
          </div>
        )}
      </div>

      <ActiveLimitOrders showMarketLink className="mb-10" />

      {/* Danger Zone */}
      <div className="bg-bg-card rounded-lg border border-red-500/30 p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
        <p className="text-text-muted text-sm mb-4">
          Once you delete your account, there is no going back. All your data, positions, and organization memberships will be permanently deleted.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
        >
          <div className="bg-bg-card rounded-xl border border-border-primary w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-border-secondary">
              <h2 className="text-lg font-semibold text-red-400">Delete Account</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-text-muted hover:text-text-primary text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <p className="text-text-muted text-sm mb-4">
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </p>
              <p className="text-text-secondary text-sm mb-2">
                Please type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg text-sm focus:ring-2 focus:ring-red-500 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== 'DELETE'}
                  className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {deleting ? 'Deleting...' : 'Delete My Account'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2.5 border border-border-secondary text-text-muted rounded-lg hover:text-text-primary transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
