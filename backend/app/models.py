from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import datetime
from bson import ObjectId

# Custom ObjectId type for Pydantic
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}


# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    token_balance: float
    is_admin: bool


# Market Models
class MarketCreate(BaseModel):
    title: str
    description: str
    resolution_date: datetime

class MarketResponse(BaseModel):
    id: str
    title: str
    description: str
    created_at: datetime
    resolution_date: datetime
    status: Literal["active", "resolved"]
    resolved_outcome: Optional[Literal["YES", "NO"]] = None
    current_yes_price: float
    current_no_price: float
    total_volume: float

class MarketResolve(BaseModel):
    outcome: Literal["YES", "NO"]


# Order Models
class OrderCreate(BaseModel):
    market_id: str
    side: Literal["YES", "NO"]
    order_type: Literal["BUY", "SELL"]
    price: float
    quantity: int

    class Config:
        json_schema_extra = {
            "example": {
                "market_id": "507f1f77bcf86cd799439011",
                "side": "YES",
                "order_type": "BUY",
                "price": 0.6,
                "quantity": 10
            }
        }


class MarketOrderCreate(BaseModel):
    market_id: str
    side: Literal["YES", "NO"]
    order_type: Literal["BUY", "SELL"]
    token_amount: float  # Total tokens to spend (for BUY) or shares to sell (for SELL)


class MarketOrderResponse(BaseModel):
    shares_filled: int
    tokens_spent: float
    average_price: float
    message: str

class OrderResponse(BaseModel):
    id: str
    market_id: str
    user_id: str
    side: Literal["YES", "NO"]
    order_type: Literal["BUY", "SELL"]
    price: float
    quantity: int
    filled_quantity: int
    status: Literal["OPEN", "FILLED", "CANCELLED", "PARTIAL"]
    created_at: datetime


# Trade Models
class TradeResponse(BaseModel):
    id: str
    market_id: str
    buyer_id: str
    seller_id: str
    side: Literal["YES", "NO"]
    price: float
    quantity: int
    executed_at: datetime


# Position Models
class PositionResponse(BaseModel):
    market_id: str
    market_title: str
    yes_shares: int
    no_shares: int
    avg_yes_price: float
    avg_no_price: float


# Portfolio Models
class PortfolioResponse(BaseModel):
    token_balance: float
    positions: list[PositionResponse]
    open_orders: list[OrderResponse]


# Orderbook Models
class OrderbookLevel(BaseModel):
    price: float
    quantity: int

class OrderbookSide(BaseModel):
    bids: list[OrderbookLevel]
    asks: list[OrderbookLevel]

class OrderbookResponse(BaseModel):
    YES: OrderbookSide
    NO: OrderbookSide
    midpoint_yes: float
    midpoint_no: float


# Leaderboard Models
class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    name: str
    token_balance: float
    position_value: float
    total_value: float


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntry]
    total: int
    page: int
    page_size: int
    total_pages: int


# Admin Management Models
class UserListEntry(BaseModel):
    id: str
    email: str
    name: str
    is_admin: bool
    token_balance: float


class UserListResponse(BaseModel):
    users: list[UserListEntry]
    total: int
    page: int
    page_size: int
    total_pages: int


class MakeAdminRequest(BaseModel):
    email: str


# Market Ideas Models
class MarketIdeaCreate(BaseModel):
    title: str
    description: str


class MarketIdeaResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    title: str
    description: str
    status: Literal["pending", "approved", "rejected"]
    created_at: datetime


class MarketIdeasListResponse(BaseModel):
    ideas: list[MarketIdeaResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
