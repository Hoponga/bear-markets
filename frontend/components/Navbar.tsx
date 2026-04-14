'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { authStorage } from '@/lib/auth';
import { authAPI, organizationsAPI, notificationsAPI } from '@/lib/api';
import AuthModal from './AuthModal';
import type { User, Organization, Notification } from '@/types';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showUserDropdown || showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown, showNotifications]);

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

      // Load initial notification count
      notificationsAPI.getAll()
        .then((data) => {
          setUnreadCount(data.unread_count);
        })
        .catch(() => {});
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

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      loadNotifications();
    }
    setShowNotifications(!showNotifications);
    setShowUserDropdown(false);
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
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

  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    // Read saved preference; null means "follow system"
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    // Determine current effective theme
    const currentIsDark = theme === 'dark' ||
      (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = currentIsDark ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  if (!isClient) {
    return null; // Avoid hydration mismatch
  }

  return (
    <>
      <nav className="bg-navbar-bg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex justify-between items-center h-12">
            {/* Left - Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <Image src="/logo.png" alt="Bearmarket" width={48} height={48} />
              <span className="text-sm font-medium text-navbar-link uppercase tracking-widest">
                Bearmarket
              </span>
            </Link>

            {/* Right - Navigation Links & User Info */}
            <div className="flex items-center space-x-5">
              {user ? (
                <>
                  <Link
                    href="/"
                    className="text-xs text-navbar-dim hover:text-navbar-link uppercase tracking-wide transition"
                  >
                    Markets
                  </Link>
                  <Link
                    href="/organizations"
                    className="text-xs text-navbar-dim hover:text-navbar-link uppercase tracking-wide transition"
                  >
                    Organizations
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="text-xs text-navbar-dim hover:text-navbar-link uppercase tracking-wide transition"
                  >
                    Leaderboard
                  </Link>
                  {/* Notifications */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={toggleNotifications}
                      className="text-navbar-dim hover:text-navbar-link transition relative"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-3 w-3 flex items-center justify-center" style={{ fontSize: '8px' }}>
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    {showNotifications && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-bg-card border border-border-primary rounded-lg shadow-lg z-50">
                        <div className="p-3 border-b border-border-primary flex justify-between items-center">
                          <p className="text-sm font-medium text-text-primary">Notifications</p>
                          {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-text-muted hover:text-text-primary">
                              Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <p className="p-3 text-sm text-text-muted text-center">No notifications</p>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                className={`p-3 border-b border-border-primary text-sm ${notif.read ? 'text-text-muted' : 'text-text-primary bg-bg-hover'}`}
                              >
                                {notif.message}
                                <p className="text-xs text-text-disabled mt-1">
                                  {new Date(notif.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-l border-navbar-border pl-5 relative" ref={dropdownRef}>
                    <button
                      onClick={toggleUserDropdown}
                      className="text-xs text-navbar-dim hover:text-navbar-link transition"
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
                          <Link
                            href="/profile"
                            className="block px-2 py-1.5 text-xs text-text-secondary hover:text-text-primary transition"
                            onClick={() => setShowUserDropdown(false)}
                          >
                            Profile Settings
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
                    href="/"
                    className="text-xs text-white/80 hover:text-white uppercase tracking-wide transition"
                  >
                    Markets
                  </Link>
                  <Link
                    href="/organizations"
                    className="text-xs text-white/80 hover:text-white uppercase tracking-wide transition"
                  >
                    Organizations
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="text-xs text-navbar-dim hover:text-navbar-link uppercase tracking-wide transition"
                  >
                    Leaderboard
                  </Link>
                  <div className="border-l border-navbar-border pl-5">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-4 py-1.5 text-xs text-navbar-dim hover:text-navbar-link uppercase tracking-wide border border-navbar-border rounded transition"
                    >
                      Sign In
                    </button>
                  </div>
                </>
              )}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="text-navbar-dim hover:text-navbar-link transition"
                aria-label="Toggle theme"
              >
                {theme === 'light' ||
                 (theme === null && typeof window !== 'undefined' && !window.matchMedia('(prefers-color-scheme: dark)').matches)
                  ? (
                    /* Moon — click to go dark */
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    /* Sun — click to go light */
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  )
                }
              </button>
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
