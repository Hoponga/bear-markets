'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { authStorage } from '@/lib/auth';
import { authAPI, organizationsAPI } from '@/lib/api';
import AuthModal from './AuthModal';
import type { User, Organization } from '@/types';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

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

  const loadUserData = async () => {
    try {
      const orgsData = await organizationsAPI.list();
      setOrganizations(orgsData);
    } catch (err) {
      console.error('Failed to load user data', err);
    }
  };

  const toggleUserDropdown = () => {
    if (!showUserDropdown) {
      loadUserData();
    }
    setShowUserDropdown(!showUserDropdown);
  };

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
      <nav className="bg-[rgb(17,24,39)] sticky top-0 z-40">
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
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={toggleUserDropdown}
                      className="text-xs text-text-muted hover:text-text-secondary transition"
                    >
                      {user.name} · {user.token_balance.toFixed(2)} tokens
                    </button>
                    {showUserDropdown && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-bg-card border border-border-primary rounded-lg shadow-lg z-50">
                        <div className="p-3 border-b border-border-primary">
                          <p className="text-sm font-medium text-text-primary">{user.name}</p>
                          <p className="text-xs text-text-muted">{user.email}</p>
                        </div>

                        <div className="p-2 border-b border-border-primary">
                          <Link
                            href="/portfolio"
                            className="block px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary transition"
                            onClick={() => setShowUserDropdown(false)}
                          >
                            Portfolio
                          </Link>
                        </div>

                        {organizations.length > 0 && (
                          <div className="p-2 border-b border-border-primary">
                            <p className="px-2 py-1 text-xs text-text-muted uppercase tracking-wide">Organizations</p>
                            {organizations.map((org) => (
                              <Link
                                key={org.id}
                                href={`/organizations/${org.id}`}
                                className="block px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary transition"
                                onClick={() => setShowUserDropdown(false)}
                              >
                                {org.name}
                              </Link>
                            ))}
                          </div>
                        )}

                        <div className="p-2 border-t border-border-primary">
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-2 py-1.5 text-xs text-text-muted hover:text-text-secondary transition"
                          >
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
