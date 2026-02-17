'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { organizationsAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import AuthModal from '@/components/AuthModal';
import type { User } from '@/types';

function JoinOrganizationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const orgId = searchParams.get('org');
  const inviteCode = searchParams.get('code');

  useEffect(() => {
    const user = authStorage.getUser();

    if (!orgId || !inviteCode) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    if (user) {
      // User is logged in, try to join immediately
      joinOrganization();
    } else {
      // User is not logged in, show auth modal
      setLoading(false);
      setShowAuthModal(true);
    }
  }, [orgId, inviteCode]);

  const joinOrganization = async () => {
    if (!orgId || !inviteCode) return;

    setJoining(true);
    setError('');

    try {
      await organizationsAPI.join(orgId, inviteCode);
      router.push(`/organizations/${orgId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to join organization');
      setJoining(false);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setShowAuthModal(false);
    authStorage.setUser(user);
    // After successful auth, join the organization
    joinOrganization();
  };

  const handleAuthClose = () => {
    setShowAuthModal(false);
    // Redirect to home if they close the auth modal
    router.push('/');
  };

  if (loading || joining) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
          <p className="mt-4 text-text-muted">
            {joining ? 'Joining organization...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center max-w-md mx-auto">
          <div className="text-red-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-text-primary mb-2">Unable to Join</h2>
          <p className="text-text-muted mb-6">{error}</p>
          <button
            onClick={() => router.push('/organizations')}
            className="text-text-primary font-medium hover:text-blue-500 transition"
          >
            Go to Organizations
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center max-w-md mx-auto">
          <h2 className="text-xl font-medium text-text-primary mb-2">Join Organization</h2>
          <p className="text-text-muted mb-6">
            Sign in or create an account to join this organization.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover transition"
          >
            Sign In / Sign Up
          </button>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal
          onClose={handleAuthClose}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}

export default function JoinOrganizationPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
          <p className="mt-4 text-text-muted">Loading...</p>
        </div>
      </div>
    }>
      <JoinOrganizationContent />
    </Suspense>
  );
}
