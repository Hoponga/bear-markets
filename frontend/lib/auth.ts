import { User } from '@/types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  setUser: (user: User): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USER_KEY);
  },

  logout: (): void => {
    authStorage.removeToken();
    authStorage.removeUser();
  },
};

export const getAuthHeader = (): { Authorization: string } | {} => {
  const token = authStorage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
