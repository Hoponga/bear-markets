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
      <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <span className="text-2xl font-bold text-blue-400">📊</span>
              <span className="text-xl font-bold text-white">
                Berkeley Markets
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-6">
              {user ? (
                <>
                  <Link
                    href="/"
                    className="text-gray-300 hover:text-blue-400 font-medium transition"
                  >
                    Markets
                  </Link>
                  <Link
                    href="/portfolio"
                    className="text-gray-300 hover:text-blue-400 font-medium transition"
                  >
                    Portfolio
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="text-gray-300 hover:text-blue-400 font-medium transition"
                  >
                    Leaderboard
                  </Link>

                  {/* User Info */}
                  <div className="flex items-center space-x-4 border-l border-gray-600 pl-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-gray-400">
                        {user.token_balance.toFixed(2)} tokens
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/leaderboard"
                    className="text-gray-300 hover:text-blue-400 font-medium transition"
                  >
                    Leaderboard
                  </Link>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition"
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
