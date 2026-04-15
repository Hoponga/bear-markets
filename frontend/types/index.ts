export interface User {
  id: string;
  email: string;
  name: string;
  token_balance: number;
  is_admin: boolean;
  held_balance: number;
  is_bot?: boolean;
}

export interface Market {
  id: string;
  title: string;
  description: string;
  created_at: string;
  resolution_date: string;
  status: 'active' | 'resolved';
  resolved_outcome: 'YES' | 'NO' | null;
  current_yes_price: number;
  current_no_price: number;
  total_volume: number;
  organization_id?: string;
  invite_code?: string;
  /** Highest buy (best bid) / lowest sell (best ask) per side; from order book */
  yes_best_bid?: number | null;
  yes_best_ask?: number | null;
  no_best_bid?: number | null;
  no_best_ask?: number | null;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  member_count: number;
  invite_code: string;
  initial_token_balance: number;
  user_token_balance: number;
  user_nickname?: string | null;
  user_is_admin: boolean;
}

export interface OrganizationMember {
  user_id: string;
  user_name: string;
  user_email: string;
  token_balance: number;
  joined_at: string;
  is_admin: boolean;
  nickname?: string | null;
}

export interface Order {
  id: string;
  market_id: string;
  user_id: string;
  side: 'YES' | 'NO';
  order_type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  filled_quantity: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED' | 'PARTIAL';
  created_at: string;
  market_title?: string | null;
}

export interface Position {
  market_id: string;
  market_title: string;
  yes_shares: number;
  no_shares: number;
  avg_yes_price: number;
  avg_no_price: number;
  /** Present when API returns portfolio; active markets still trading */
  market_status?: 'active' | 'resolved';
  /** Set when the market has resolved */
  resolved_outcome?: 'YES' | 'NO' | null;
}

export interface Portfolio {
  token_balance: number;
  positions: Position[];
  open_orders: Order[];
}

export interface OrderbookLevel {
  price: number;
  quantity: number;
}

export interface OrderbookSide {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
}

export interface Orderbook {
  YES: OrderbookSide;
  NO: OrderbookSide;
  midpoint_yes: number;
  midpoint_no: number;
}

export interface Trade {
  market_id: string;
  side: 'YES' | 'NO';
  price: number;
  quantity: number;
  timestamp: string;
  trade_type?: 'MINT';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  email: string;
  token_balance: number;
  position_value: number;
  total_value: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserListEntry {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  is_bot?: boolean;
  token_balance: number;
}

export interface UserListResponse {
  users: UserListEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BotPosition {
  market_id: string;
  market_title: string;
  market_status: string;
  yes_shares: number;
  no_shares: number;
  avg_yes_price: number;
  avg_no_price: number;
}

export interface BotStatus {
  id: string;
  name: string;
  email: string;
  token_balance: number;
  total_position_value: number;
  positions: BotPosition[];
  open_orders_count: number;
  recent_trades_24h: number;
  created_at: string;
}

export interface MarketIdea {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  like_count: number;
  dislike_count: number;
  user_vote: 'like' | 'dislike' | null;
}

export interface MarketIdeasResponse {
  ideas: MarketIdea[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MarketOrderResponse {
  shares_filled: number;
  tokens_spent: number;
  average_price: number;
  message: string;
}

// Pool Bet Types
export interface PoolBet {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  bet_type: 'fixed' | 'variable';
  fixed_fee?: number;
  min_fee?: number;
  status: 'open' | 'locked' | 'resolved';
  resolved_outcome?: 'YES' | 'NO';
  yes_pool: number;
  no_pool: number;
  yes_count: number;
  no_count: number;
  created_by: string;
  created_at: string;
  user_bet?: {
    side: 'YES' | 'NO';
    amount: number;
  };
  participants_public: boolean;
}

export interface PoolBetEntry {
  user_id: string;
  user_name: string;
  side: 'YES' | 'NO';
  amount: number;
  placed_at: string;
}

export interface BetComment {
  id: string;
  user_id: string;
  user_name: string;
  user_side: 'YES' | 'NO';
  text: string;
  created_at: string;
}

export interface MarketComment {
  id: string;
  user_id: string;
  user_name: string;
  user_side: 'YES' | 'NO';
  text: string;
  created_at: string;
}

// Notification Types
export interface Notification {
  id: string;
  message: string;
  bet_id?: string;
  organization_id?: string;
  market_id?: string;
  read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}
