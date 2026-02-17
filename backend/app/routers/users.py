from fastapi import APIRouter, HTTPException, Depends, status
from datetime import timedelta
from bson import ObjectId

from app.models import (
    UserCreate, UserLogin, UserResponse, PortfolioResponse, PositionResponse,
    OrderResponse, LeaderboardEntry, LeaderboardResponse, UserListEntry,
    UserListResponse, MakeAdminRequest, MarketIdeaCreate, MarketIdeaResponse,
    MarketIdeasListResponse
)
from app.auth import get_password_hash, verify_password, create_access_token, get_current_user, get_current_admin, ACCESS_TOKEN_EXPIRE_MINUTES
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


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(page: int = 1, page_size: int = 10):
    """Get paginated leaderboard of users sorted by total portfolio value (tokens + positions)"""
    db = await get_database()

    # Validate pagination params
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 10
    if page_size > 100:
        page_size = 100

    # Get total count
    total = await db.users.count_documents({})

    # Calculate skip value
    skip = (page - 1) * page_size

    # Aggregation pipeline to calculate total portfolio value
    pipeline = [
        # Lookup positions for each user
        {
            "$lookup": {
                "from": "positions",
                "localField": "_id",
                "foreignField": "user_id",
                "as": "positions"
            }
        },
        # Unwind positions (preserving users with no positions)
        {
            "$unwind": {
                "path": "$positions",
                "preserveNullAndEmptyArrays": True
            }
        },
        # Lookup market data for each position
        {
            "$lookup": {
                "from": "markets",
                "localField": "positions.market_id",
                "foreignField": "_id",
                "as": "market_data"
            }
        },
        # Unwind market data
        {
            "$unwind": {
                "path": "$market_data",
                "preserveNullAndEmptyArrays": True
            }
        },
        # Calculate position value for each position
        {
            "$addFields": {
                "position_value": {
                    "$cond": {
                        "if": {"$and": ["$positions", "$market_data"]},
                        "then": {
                            "$add": [
                                {"$multiply": [
                                    {"$ifNull": ["$positions.yes_shares", 0]},
                                    {"$ifNull": ["$market_data.current_yes_price", 0.5]}
                                ]},
                                {"$multiply": [
                                    {"$ifNull": ["$positions.no_shares", 0]},
                                    {"$ifNull": ["$market_data.current_no_price", 0.5]}
                                ]}
                            ]
                        },
                        "else": 0
                    }
                }
            }
        },
        # Group by user to sum all position values
        {
            "$group": {
                "_id": "$_id",
                "name": {"$first": "$name"},
                "email": {"$first": "$email"},
                "token_balance": {"$first": "$token_balance"},
                "total_position_value": {"$sum": "$position_value"}
            }
        },
        # Calculate total value
        {
            "$addFields": {
                "total_value": {"$add": ["$token_balance", "$total_position_value"]}
            }
        },
        # Sort by total value descending
        {"$sort": {"total_value": -1}},
        # Skip and limit for pagination
        {"$skip": skip},
        {"$limit": page_size}
    ]

    cursor = db.users.aggregate(pipeline)

    entries = []
    rank = skip + 1
    async for user in cursor:
        entries.append(LeaderboardEntry(
            rank=rank,
            user_id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            token_balance=user["token_balance"],
            position_value=round(user["total_position_value"], 2),
            total_value=round(user["total_value"], 2)
        ))
        rank += 1

    total_pages = (total + page_size - 1) // page_size  # Ceiling division

    return LeaderboardResponse(
        entries=entries,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


# Admin Management Endpoints

@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = 1,
    page_size: int = 20,
    current_user: dict = Depends(get_current_admin)
):
    """List all users (admin only)"""
    db = await get_database()

    # Validate pagination params
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    total = await db.users.count_documents({})
    skip = (page - 1) * page_size

    cursor = db.users.find({}).sort("created_at", -1).skip(skip).limit(page_size)

    users = []
    async for user in cursor:
        users.append(UserListEntry(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            is_admin=user.get("is_admin", False),
            token_balance=user["token_balance"]
        ))

    total_pages = (total + page_size - 1) // page_size

    return UserListResponse(
        users=users,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("/make-admin")
async def make_admin(
    request: MakeAdminRequest,
    current_user: dict = Depends(get_current_admin)
):
    """Make a user an admin by email (admin only)"""
    db = await get_database()

    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.get("is_admin", False):
        return {"message": f"{request.email} is already an admin"}

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_admin": True}}
    )

    return {"message": f"{request.email} is now an admin"}


@router.post("/remove-admin")
async def remove_admin(
    request: MakeAdminRequest,
    current_user: dict = Depends(get_current_admin)
):
    """Remove admin status from a user by email (admin only)"""
    db = await get_database()

    user = await db.users.find_one({"email": request.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent removing own admin status
    if str(user["_id"]) == str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin status"
        )

    if not user.get("is_admin", False):
        return {"message": f"{request.email} is not an admin"}

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_admin": False}}
    )

    return {"message": f"{request.email} is no longer an admin"}


# Market Ideas Endpoints

@router.post("/market-ideas", response_model=MarketIdeaResponse)
async def submit_market_idea(
    idea: MarketIdeaCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a market idea (authenticated users only)"""
    db = await get_database()

    idea_dict = {
        "user_id": current_user["_id"],
        "user_name": current_user["name"],
        "title": idea.title,
        "description": idea.description,
        "status": "pending",
        "created_at": datetime.utcnow()
    }

    result = await db.market_ideas.insert_one(idea_dict)

    return MarketIdeaResponse(
        id=str(result.inserted_id),
        user_id=str(current_user["_id"]),
        user_name=current_user["name"],
        title=idea.title,
        description=idea.description,
        status="pending",
        created_at=idea_dict["created_at"]
    )


@router.get("/market-ideas", response_model=MarketIdeasListResponse)
async def list_market_ideas(
    page: int = 1,
    page_size: int = 20,
    status_filter: str = None,
    current_user: dict = Depends(get_current_admin)
):
    """List all market ideas (admin only)"""
    db = await get_database()

    # Validate pagination params
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    query = {}
    if status_filter:
        query["status"] = status_filter

    total = await db.market_ideas.count_documents(query)
    skip = (page - 1) * page_size

    cursor = db.market_ideas.find(query).sort("created_at", -1).skip(skip).limit(page_size)

    ideas = []
    async for idea in cursor:
        ideas.append(MarketIdeaResponse(
            id=str(idea["_id"]),
            user_id=str(idea["user_id"]),
            user_name=idea["user_name"],
            title=idea["title"],
            description=idea["description"],
            status=idea["status"],
            created_at=idea["created_at"]
        ))

    total_pages = (total + page_size - 1) // page_size

    return MarketIdeasListResponse(
        ideas=ideas,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("/market-ideas/{idea_id}/update-status")
async def update_idea_status(
    idea_id: str,
    new_status: str,
    current_user: dict = Depends(get_current_admin)
):
    """Update market idea status (admin only)"""
    db = await get_database()

    if new_status not in ["pending", "approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be: pending, approved, or rejected"
        )

    if not ObjectId.is_valid(idea_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid idea ID"
        )

    result = await db.market_ideas.update_one(
        {"_id": ObjectId(idea_id)},
        {"$set": {"status": new_status}}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market idea not found"
        )

    return {"message": f"Idea status updated to {new_status}"}
