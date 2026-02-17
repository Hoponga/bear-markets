import axios from 'axios';
import { authStorage, getAuthHeader } from './auth';
import type {
  User,
  Market,
  Order,
  Portfolio,
  Orderbook,
  AuthResponse,
  LeaderboardResponse,
  UserListResponse,
  MarketIdea,
  MarketIdeasResponse,
  MarketOrderResponse
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const authHeader = getAuthHeader();
  if ('Authorization' in authHeader) {
    config.headers.set('Authorization', authHeader.Authorization);
  }
  return config;
});

// Public endpoints that never require auth - don't logout/redirect on 401 for these
// (avoids redirect loop if a public endpoint wrongly returns 401)
const PUBLIC_401_SKIP = [
  '/api/markets',           // list, get, orderbook - all public
  '/api/auth/leaderboard',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/google',
];

function isPublicEndpoint(url: string): boolean {
  try {
    const path = new URL(url, API_URL).pathname;
    return PUBLIC_401_SKIP.some((p) => path === p || path.startsWith(p + '/'));
  } catch {
    return false;
  }
}

// Handle auth errors - logout on 401 for protected endpoints only; never redirect
// (redirect caused infinite loop when /api/markets returned 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isPublicEndpoint(error.config?.url || '')) {
      authStorage.logout();
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const { data } = await api.post('/api/auth/register', { email, password, name });
    return data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post('/api/auth/login', { email, password });
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get('/api/auth/me');
    return data;
  },

  getPortfolio: async (): Promise<Portfolio> => {
    const { data } = await api.get('/api/auth/portfolio');
    return data;
  },

  googleAuth: async (credential: string): Promise<AuthResponse> => {
    const { data } = await api.post('/api/auth/google', { credential });
    return data;
  },
};

// Markets endpoints
export const marketsAPI = {
  list: async (status: string = 'active'): Promise<Market[]> => {
    const { data } = await api.get('/api/markets', { params: { status_filter: status } });
    return data;
  },

  get: async (marketId: string): Promise<Market> => {
    const { data } = await api.get(`/api/markets/${marketId}`);
    return data;
  },

  getOrderbook: async (marketId: string): Promise<Orderbook> => {
    const { data } = await api.get(`/api/markets/${marketId}/orderbook`);
    return data;
  },

  create: async (title: string, description: string, resolutionDate: string): Promise<Market> => {
    const { data } = await api.post('/api/markets', {
      title,
      description,
      resolution_date: resolutionDate,
    });
    return data;
  },

  resolve: async (marketId: string, outcome: 'YES' | 'NO'): Promise<void> => {
    await api.post(`/api/markets/${marketId}/resolve`, { outcome });
  },

  delete: async (marketId: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/api/markets/${marketId}`);
    return data;
  },
  // Private markets
  createPrivate: async (
    title: string,
    description: string,
    resolutionDate: string,
    initialTokenBalance: number = 1000
  ): Promise<Market> => {
    const { data } = await api.post('/api/markets/private', {
      title,
      description,
      resolution_date: resolutionDate,
      initial_token_balance: initialTokenBalance,
      is_private: true,
    });
    return data;
  },

  joinPrivate: async (inviteCode: string): Promise<Market> => {
    const { data } = await api.post(`/api/markets/join/${inviteCode}`);
    return data;
  },

  getMyPrivateMarkets: async (): Promise<Market[]> => {
    const { data} = await api.get('/api/markets/private/my-markets');
    return data;
  },
};

// Orders endpoints
export const ordersAPI = {
  create: async (
    marketId: string,
    side: 'YES' | 'NO',
    orderType: 'BUY' | 'SELL',
    price: number,
    quantity: number
  ): Promise<Order> => {
    const { data } = await api.post('/api/orders', {
      market_id: marketId,
      side,
      order_type: orderType,
      price,
      quantity,
    });
    return data;
  },

  createMarketOrder: async (
    marketId: string,
    side: 'YES' | 'NO',
    orderType: 'BUY' | 'SELL',
    tokenAmount: number
  ): Promise<MarketOrderResponse> => {
    const { data } = await api.post('/api/orders/market', {
      market_id: marketId,
      side,
      order_type: orderType,
      token_amount: tokenAmount,
    });
    return data;
  },

  getMyOrders: async (status?: string): Promise<Order[]> => {
    const { data } = await api.get('/api/orders/my-orders', {
      params: status ? { status_filter: status } : {},
    });
    return data;
  },

  cancel: async (orderId: string): Promise<void> => {
    await api.delete(`/api/orders/${orderId}`);
  },
};

// Leaderboard endpoints
export const leaderboardAPI = {
  get: async (page: number = 1, pageSize: number = 10): Promise<LeaderboardResponse> => {
    const { data } = await api.get('/api/auth/leaderboard', {
      params: { page, page_size: pageSize },
    });
    return data;
  },
};

// Admin endpoints
export const adminAPI = {
  listUsers: async (page: number = 1, pageSize: number = 20): Promise<UserListResponse> => {
    const { data } = await api.get('/api/auth/users', {
      params: { page, page_size: pageSize },
    });
    return data;
  },

  makeAdmin: async (email: string): Promise<{ message: string }> => {
    const { data } = await api.post('/api/auth/make-admin', { email });
    return data;
  },

  removeAdmin: async (email: string): Promise<{ message: string }> => {
    const { data } = await api.post('/api/auth/remove-admin', { email });
    return data;
  },

  listMarketIdeas: async (
    page: number = 1,
    pageSize: number = 20,
    statusFilter?: string
  ): Promise<MarketIdeasResponse> => {
    const { data } = await api.get('/api/auth/market-ideas', {
      params: { page, page_size: pageSize, status_filter: statusFilter },
    });
    return data;
  },

  updateIdeaStatus: async (ideaId: string, status: string): Promise<{ message: string }> => {
    const { data } = await api.post(`/api/auth/market-ideas/${ideaId}/update-status`, null, {
      params: { new_status: status },
    });
    return data;
  },
};

// Market Ideas endpoints (for regular users)
export const marketIdeasAPI = {
  submit: async (title: string, description: string): Promise<MarketIdea> => {
    const { data } = await api.post('/api/auth/market-ideas', { title, description });
    return data;
  },
};

export default api;

// Organizations endpoints
export const organizationsAPI = {
  create: async (name: string, description: string, initialTokenBalance: number = 1000) => {
    const { data } = await api.post('/api/organizations', {
      name,
      description,
      initial_token_balance: initialTokenBalance,
    });
    return data;
  },

  list: async () => {
    const { data } = await api.get('/api/organizations');
    return data;
  },

  get: async (orgId: string) => {
    const { data } = await api.get(`/api/organizations/${orgId}`);
    return data;
  },

  join: async (orgId: string, inviteCode: string) => {
    const { data } = await api.post(`/api/organizations/${orgId}/join/${inviteCode}`);
    return data;
  },

  getMembers: async (orgId: string) => {
    const { data } = await api.get(`/api/organizations/${orgId}/members`);
    return data;
  },

  getLeaderboard: async (orgId: string) => {
    const { data } = await api.get(`/api/organizations/${orgId}/leaderboard`);
    return data;
  },

  createMarket: async (orgId: string, title: string, description: string, resolutionDate: string) => {
    const { data } = await api.post(`/api/organizations/${orgId}/markets`, {
      title,
      description,
      resolution_date: resolutionDate,
    });
    return data;
  },

  getMarkets: async (orgId: string) => {
    const { data } = await api.get(`/api/organizations/${orgId}/markets`);
    return data;
  },

  // Pool Bets
  createBet: async (orgId: string, title: string, description: string, betType: 'fixed' | 'variable', options: {
    fixedFee?: number;
    minFee?: number;
    seedYes?: number;
    seedNo?: number;
  }) => {
    const { data } = await api.post(`/api/organizations/${orgId}/bets`, {
      title,
      description,
      bet_type: betType,
      fixed_fee: options.fixedFee,
      min_fee: options.minFee,
      seed_yes: options.seedYes,
      seed_no: options.seedNo,
    });
    return data;
  },

  getBets: async (orgId: string) => {
    const { data } = await api.get(`/api/organizations/${orgId}/bets`);
    return data;
  },

  getBet: async (orgId: string, betId: string) => {
    const { data } = await api.get(`/api/organizations/${orgId}/bets/${betId}`);
    return data;
  },

  joinBet: async (orgId: string, betId: string, side: 'YES' | 'NO', amount?: number) => {
    const { data } = await api.post(`/api/organizations/${orgId}/bets/${betId}/join`, {
      side,
      amount,
    });
    return data;
  },

  lockBet: async (orgId: string, betId: string) => {
    const { data } = await api.post(`/api/organizations/${orgId}/bets/${betId}/lock`);
    return data;
  },

  resolveBet: async (orgId: string, betId: string, outcome: 'YES' | 'NO') => {
    const { data } = await api.post(`/api/organizations/${orgId}/bets/${betId}/resolve`, {
      outcome,
    });
    return data;
  },

  undoBet: async (orgId: string, betId: string) => {
    const { data } = await api.post(`/api/organizations/${orgId}/bets/${betId}/undo`);
    return data;
  },

  getBetEntries: async (orgId: string, betId: string) => {
    const { data } = await api.get(`/api/organizations/${orgId}/bets/${betId}/entries`);
    return data;
  },

  editMemberBalance: async (orgId: string, userId: string, newBalance: number) => {
    const { data } = await api.post(`/api/organizations/${orgId}/members/${userId}/balance?new_balance=${newBalance}`);
    return data;
  },
};

// Notifications
export const notificationsAPI = {
  getAll: async () => {
    const { data } = await api.get('/api/notifications');
    return data;
  },

  markRead: async (notificationId: string) => {
    const { data } = await api.post(`/api/notifications/${notificationId}/read`);
    return data;
  },

  markAllRead: async () => {
    const { data } = await api.post('/api/notifications/read-all');
    return data;
  },
};
