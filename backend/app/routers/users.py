from fastapi import APIRouter, HTTPException, Depends, status
from datetime import timedelta
from bson import ObjectId

from app.models import UserCreate, UserLogin, UserResponse, PortfolioResponse, PositionResponse, OrderResponse
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_database
from datetime import datetime

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(user_data: UserCreate):
    """Register a new user with 1000 initial tokens"""
    db = await get_database()

    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    user_dict = {
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "name": user_data.name,
        "token_balance": 1000.0,  # Initial balance
        "is_admin": False,
        "created_at": datetime.utcnow()
    }

    
    result = await db.users.insert_one(user_dict)

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(result.inserted_id)},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=str(result.inserted_id),
            email=user_data.email,
            name=user_data.name,
            token_balance=1000.0,
            is_admin=False
        )
    }


@router.post("/login")
async def login(user_data: UserLogin):
    """Login and receive JWT token"""
    db = await get_database()

    # Find user
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            token_balance=user["token_balance"],
            is_admin=user.get("is_admin", False)
        )
    }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        token_balance=current_user["token_balance"],
        is_admin=current_user.get("is_admin", False)
    )


@router.get("/portfolio", response_model=PortfolioResponse)
async def get_portfolio(current_user: dict = Depends(get_current_user)):
    """Get user's portfolio (positions and open orders)"""
    db = await get_database()
    user_id = current_user["_id"]

    # Get positions
    positions_cursor = db.positions.find({"user_id": user_id})
    positions = []

    async for pos in positions_cursor:
        market = await db.markets.find_one({"_id": pos["market_id"]})
        if market:
            positions.append(PositionResponse(
                market_id=str(pos["market_id"]),
                market_title=market["title"],
                yes_shares=pos["yes_shares"],
                no_shares=pos["no_shares"],
                avg_yes_price=pos["avg_yes_price"],
                avg_no_price=pos["avg_no_price"]
            ))

    # Get open orders
    orders_cursor = db.orders.find({
        "user_id": user_id,
        "status": {"$in": ["OPEN", "PARTIAL"]}
    }).sort("created_at", -1)

    open_orders = []
    async for order in orders_cursor:
        open_orders.append(OrderResponse(
            id=str(order["_id"]),
            market_id=str(order["market_id"]),
            user_id=str(order["user_id"]),
            side=order["side"],
            order_type=order["order_type"],
            price=order["price"],
            quantity=order["quantity"],
            filled_quantity=order["filled_quantity"],
            status=order["status"],
            created_at=order["created_at"]
        ))

    return PortfolioResponse(
        token_balance=current_user["token_balance"],
        positions=positions,
        open_orders=open_orders
    )
