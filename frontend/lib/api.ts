import axios from 'axios';
import { authStorage, getAuthHeader } from './auth';
import type {
  User,
  Market,
  Order,
  Portfolio,
  Orderbook,
  AuthResponse
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
  config.headers = { ...config.headers, ...authHeader };
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authStorage.logout();
      window.location.href = '/';
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

export default api;
