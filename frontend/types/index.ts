export interface User {
  id: string;
  email: string;
  name: string;
  token_balance: number;
  is_admin: boolean;
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
}

export interface OrganizationMember {
  user_id: string;
  user_name: string;
  user_email: string;
  token_balance: number;
  joined_at: string;
  is_admin: boolean;
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
}

export interface Position {
  market_id: string;
  market_title: string;
  yes_shares: number;
  no_shares: number;
  avg_yes_price: number;
  avg_no_price: number;
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
  token_balance: number;
}

export interface UserListResponse {
  users: UserListEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MarketIdea {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
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
