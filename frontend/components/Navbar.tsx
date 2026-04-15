'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { authStorage } from '@/lib/auth';
import { authAPI, organizationsAPI, notificationsAPI } from '@/lib/api';
import AuthModal from './AuthModal';
import type { User, Organization, Notification } from '@/types';

function notificationLink(notif: Notification): string | null {
  if (notif.market_id) {
    return `/market/${notif.market_id}`;
  }
  if (notif.organization_id && notif.bet_id) {
    return `/organizations/${notif.organization_id}/bets/${notif.bet_id}`;
  }
  return null;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showOrgNavDropdown, setShowOrgNavDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    if (showUserDropdown || showNotifications || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown, showNotifications, showMobileMenu]);

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

  const loadUserData = useCallback(async () => {
    try {
      const orgsData = await organizationsAPI.list();
      setOrganizations(orgsData);
    } catch (err) {
      console.error('Failed to load user data', err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      return;
    }
    void loadUserData();
  }, [user, loadUserData]);

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

  const [theme, setTheme] = useState<'light' | 'dark' | null>(() =>
    typeof window !== 'undefined'
      ? (localStorage.getItem('theme') as 'light' | 'dark' | null)
      : null
  );
  const [systemPrefersLight, setSystemPrefersLight] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: light)').matches
      : false
  );

  useEffect(() => {
    if (theme !== null) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setSystemPrefersLight(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const isLightUi =
    theme === 'light' || (theme === null && systemPrefersLight);
  const logoSrc = isLightUi ? '/logo_light_mode.png' : '/logo.png';

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
          <div className="flex justify-between items-center py-3">
            {/* Left - Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <Image
                key={logoSrc}
                src={logoSrc}
                alt="Bearmarket"
                width={48}
                height={48}
              />
              <span className="text-sm font-medium text-navbar-link uppercase tracking-widest hidden sm:inline">
                Bearmarket
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-5">
              {user ? (
                <>
                  <Link
                    href="/"
                    className="text-sm text-text-muted hover:text-text-primary font-medium transition"
                  >
                    Markets
                  </Link>
                  <div
                    className="relative"
                    onMouseEnter={() => setShowOrgNavDropdown(true)}
                    onMouseLeave={() => setShowOrgNavDropdown(false)}
                  >
                    <Link
                      href="/organizations"
                      className="text-sm text-text-muted hover:text-text-primary font-medium transition"
                    >
                      Organizations
                    </Link>
                    {showOrgNavDropdown && (
                      <div className="absolute left-0 top-full z-50 pt-1 min-w-[12rem]">
                        <div className="bg-bg-card border border-border-primary rounded-lg shadow-lg py-1">
                          {organizations.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-text-muted whitespace-nowrap">
                              No organizations yet
                            </p>
                          ) : (
                            organizations.map((org) => (
                              <Link
                                key={org.id}
                                href={`/organizations/${org.id}`}
                                className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition whitespace-nowrap"
                                onClick={() => setShowOrgNavDropdown(false)}
                              >
                                {org.name}
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <Link
                    href="/leaderboard"
                    className="text-sm text-text-muted hover:text-text-primary font-medium transition"
                  >
                    Leaderboard
                  </Link>
                  <Link
                    href="/about"
                    className="text-sm text-text-muted hover:text-text-primary font-medium transition"
                  >
                    About
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
                            notifications.map((notif) => {
                              const href = notificationLink(notif);
                              const rowClass = `p-3 border-b border-border-primary text-sm ${notif.read ? 'text-text-muted' : 'text-text-primary bg-bg-hover'}`;
                              const inner = (
                                <>
                                  {notif.message}
                                  <p className="text-xs text-text-disabled mt-1">
                                    {new Date(notif.created_at).toLocaleDateString()}
                                  </p>
                                </>
                              );
                              return href ? (
                                <Link
                                  key={notif.id}
                                  href={href}
                                  onClick={() => setShowNotifications(false)}
                                  className={`block ${rowClass} hover:brightness-95 dark:hover:brightness-110 transition`}
                                >
                                  {inner}
                                </Link>
                              ) : (
                                <div key={notif.id} className={rowClass}>
                                  {inner}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-l border-navbar-border pl-5 relative" ref={dropdownRef}>
                    <button
                      onClick={toggleUserDropdown}
                      className="text-sm text-text-muted hover:text-text-primary font-medium transition"
                    >
                      {user.name} · {((user.token_balance ?? 0) - (user.held_balance ?? 0)).toFixed(2)} tokens{(user.held_balance ?? 0) > 0 ? ` (+${(user.held_balance ?? 0).toFixed(2)} held)` : ''}
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
                    className="text-sm text-text-muted hover:text-text-primary font-medium transition"
                  >
                    Markets
                  </Link>
                  <Link
                    href="/organizations"
                    className="text-sm text-text-muted hover:text-text-primary font-medium transition"
                  >
                    Organizations
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="text-sm text-text-muted hover:text-text-primary font-medium transition"
                  >
                    Leaderboard
                  </Link>
                  <Link
                    href="/about"
                    className="text-sm text-text-muted hover:text-text-primary font-medium transition"
                  >
                    About
                  </Link>
                  <div className="pl-5">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="px-4 py-1.5 text-sm text-text-muted hover:text-text-primary font-medium border border-border-primary rounded transition"
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  )
                }
              </button>
            </div>

            {/* Mobile Navigation Controls */}
            <div className="flex md:hidden items-center space-x-3">
              {/* Mobile notifications */}
              {user && (
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={toggleNotifications}
                    className="text-navbar-dim hover:text-navbar-link transition relative p-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center" style={{ fontSize: '10px' }}>
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
                          notifications.map((notif) => {
                            const href = notificationLink(notif);
                            const rowClass = `p-3 border-b border-border-primary text-sm ${notif.read ? 'text-text-muted' : 'text-text-primary bg-bg-hover'}`;
                            const inner = (
                              <>
                                {notif.message}
                                <p className="text-xs text-text-disabled mt-1">
                                  {new Date(notif.created_at).toLocaleDateString()}
                                </p>
                              </>
                            );
                            return href ? (
                              <Link
                                key={notif.id}
                                href={href}
                                onClick={() => setShowNotifications(false)}
                                className={`block ${rowClass} hover:brightness-95 dark:hover:brightness-110 transition`}
                              >
                                {inner}
                              </Link>
                            ) : (
                              <div key={notif.id} className={rowClass}>
                                {inner}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Theme toggle mobile */}
              <button
                onClick={toggleTheme}
                className="text-navbar-dim hover:text-navbar-link transition p-2"
                aria-label="Toggle theme"
              >
                {theme === 'light' ||
                 (theme === null && typeof window !== 'undefined' && !window.matchMedia('(prefers-color-scheme: dark)').matches)
                  ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  )
                }
              </button>

              {/* Hamburger menu button */}
              <div ref={mobileMenuRef}>
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="text-navbar-dim hover:text-navbar-link transition p-2"
                  aria-label="Open menu"
                >
                  {showMobileMenu ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>

                {/* Mobile menu dropdown */}
                {showMobileMenu && (
                  <div className="absolute right-4 top-full mt-2 w-64 bg-bg-card border border-border-primary rounded-lg shadow-lg z-50">
                    {user ? (
                      <>
                        {/* User info */}
                        <div className="p-4 border-b border-border-primary">
                          <p className="text-sm font-medium text-text-primary">{user.name}</p>
                          <p className="text-xs text-text-muted">{user.email}</p>
                          <p className="text-sm text-text-secondary mt-1">{user.token_balance.toFixed(2)} tokens</p>
                        </div>

                        {/* Navigation links */}
                        <div className="py-2">
                          <Link
                            href="/"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            Markets
                          </Link>
                          <Link
                            href="/organizations"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            Organizations
                          </Link>
                          <Link
                            href="/leaderboard"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            Leaderboard
                          </Link>
                          <Link
                            href="/about"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            About
                          </Link>
                        </div>

                        {/* User actions */}
                        <div className="py-2 border-t border-border-primary">
                          <Link
                            href="/portfolio"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            Portfolio
                          </Link>
                          <Link
                            href="/profile"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            Profile Settings
                          </Link>
                          {user.is_admin && (
                            <Link
                              href="/admin"
                              className="block px-4 py-2 text-sm text-accent-purple hover:bg-bg-hover transition"
                              onClick={() => setShowMobileMenu(false)}
                            >
                              Admin Panel
                            </Link>
                          )}
                        </div>

                        {/* Organizations */}
                        {organizations.length > 0 && (
                          <div className="py-2 border-t border-border-primary">
                            <p className="px-4 py-1 text-xs text-text-muted uppercase tracking-wide">Organizations</p>
                            {organizations.map((org) => (
                              <Link
                                key={org.id}
                                href={`/organizations/${org.id}`}
                                className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                                onClick={() => setShowMobileMenu(false)}
                              >
                                {org.name}
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Logout */}
                        <div className="py-2 border-t border-border-primary">
                          <button
                            onClick={() => {
                              handleLogout();
                              setShowMobileMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-text-secondary hover:bg-bg-hover transition"
                          >
                            Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Navigation links for non-logged-in users */}
                        <div className="py-2">
                          <Link
                            href="/"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            Markets
                          </Link>
                          <Link
                            href="/organizations"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            Organizations
                          </Link>
                          <Link
                            href="/leaderboard"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            Leaderboard
                          </Link>
                          <Link
                            href="/about"
                            className="block px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition"
                            onClick={() => setShowMobileMenu(false)}
                          >
                            About
                          </Link>
                        </div>

                        {/* Sign in button */}
                        <div className="p-4 border-t border-border-primary">
                          <button
                            onClick={() => {
                              setShowAuthModal(true);
                              setShowMobileMenu(false);
                            }}
                            className="w-full px-4 py-2 text-sm text-text-primary font-medium bg-btn-primary rounded hover:bg-btn-primary-hover transition"
                          >
                            Sign In
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
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
