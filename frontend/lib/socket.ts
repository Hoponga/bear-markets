import { io, Socket } from 'socket.io-client';
import type { Orderbook, Trade } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000';

class SocketManager {
  private socket: Socket | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('orderbook_update', (data) => {
      this.emit('orderbook_update', data);
    });

    this.socket.on('trade_executed', (data) => {
      this.emit('trade_executed', data);
    });

    this.socket.on('portfolio_update', (data) => {
      this.emit('portfolio_update', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeMarket(marketId: string): void {
    if (!this.socket) this.connect();
    this.socket?.emit('subscribe_market', { market_id: marketId });
  }

  unsubscribeMarket(marketId: string): void {
    this.socket?.emit('unsubscribe_market', { market_id: marketId });
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(event);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(event);
        }
      }
    };
  }

  private emit(event: string, data: any): void {
    const subs = this.subscribers.get(event);
    if (subs) {
      subs.forEach((callback) => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const socketManager = new SocketManager();

// Type-safe event listeners
export const useOrderbookUpdates = (
  marketId: string,
  callback: (data: { market_id: string; orderbook: Orderbook; midpoint: { YES: number; NO: number } }) => void
) => {
  return socketManager.on('orderbook_update', (data) => {
    if (data.market_id === marketId) {
      callback(data);
    }
  });
};

export const useTradeUpdates = (
  marketId: string,
  callback: (trade: Trade) => void
) => {
  return socketManager.on('trade_executed', (data) => {
    if (data.market_id === marketId) {
      callback(data);
    }
  });
};

export default socketManager;
