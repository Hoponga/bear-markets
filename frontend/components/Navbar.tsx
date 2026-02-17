'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authStorage } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import AuthModal from './AuthModal';
import type { User } from '@/types';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedUser = authStorage.getUser();
    setUser(storedUser);

    // Refresh user data if logged in
    if (storedUser) {
      authAPI.getMe()
        .then((userData) => {
          setUser(userData);
          authStorage.setUser(userData);
        })
        .catch(() => {
          authStorage.logout();
          setUser(null);
        });
    }
  }, []);

  const handleLogout = () => {
    authStorage.logout();
    setUser(null);
    window.location.href = '/';
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setShowAuthModal(false);
  };

  if (!isClient) {
    return null; // Avoid hydration mismatch
  }

  return (
    <>
      <nav className="bg-bg-card border-b border-border-primary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold">📊</span>
              <span className="text-xl font-bold text-text-primary">
                Bear Markets
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-6">
              {user ? (
                <>
                  <Link
                    href="/"
                    className="text-text-secondary hover:text-text-primary font-medium transition"
                  >
                    Markets
                  </Link>
                  <Link
                    href="/portfolio"
                    className="text-text-secondary hover:text-text-primary font-medium transition"
                  >
                    Portfolio
                  </Link>
                  <Link
                    href="/organizations"
                    className="text-text-secondary hover:text-text-primary font-medium transition"
                  >
                    Organizations
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="text-text-secondary hover:text-text-primary font-medium transition"
                  >
                    Leaderboard
                  </Link>

                  {/* User Info */}
                  <div className="flex items-center space-x-4 border-l border-border-secondary pl-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-text-primary">{user.name}</p>
                      <p className="text-xs text-text-muted">
                        {user.token_balance.toFixed(2)} tokens
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary border border-border-secondary rounded-lg hover:bg-bg-hover transition"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/leaderboard"
                    className="text-text-secondary hover:text-text-primary font-medium transition"
                  >
                    Leaderboard
                  </Link>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover transition"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}
