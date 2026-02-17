'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
      <nav className="bg-transparent sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            {/* Left - Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/logo.png" alt="Bearmarket" width={48} height={48} />
              <span className="text-sm font-medium text-text-muted uppercase tracking-widest">
                Bearmarket
              </span>
            </Link>

            {/* Right - Navigation Links & User Info */}
            <div className="flex items-center space-x-5">
              {user ? (
                <>
                  <Link
                    href="/"
                    className="text-xs text-text-muted hover:text-text-secondary uppercase tracking-wide transition"
                  >
                    Markets
                  </Link>
                  <Link
                    href="/portfolio"
                    className="text-xs text-text-muted hover:text-text-secondary uppercase tracking-wide transition"
                  >
                    Portfolio
                  </Link>
                  <Link
                    href="/organizations"
                    className="text-xs text-text-muted hover:text-text-secondary uppercase tracking-wide transition"
                  >
                    Organizations
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="text-xs text-text-muted hover:text-text-secondary uppercase tracking-wide transition"
                  >
                    Leaderboard
                  </Link>
                  <span className="text-xs text-text-muted">
                    {user.name} · {user.token_balance.toFixed(2)} tokens
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-text-muted hover:text-text-secondary transition"
                    title="Logout"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/leaderboard"
                    className="text-xs text-text-muted hover:text-text-secondary uppercase tracking-wide transition"
                  >
                    Leaderboard
                  </Link>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-4 py-1.5 text-xs text-text-muted hover:text-text-secondary uppercase tracking-wide border border-border-secondary/50 rounded transition"
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
