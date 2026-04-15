from fastapi import APIRouter, HTTPException, Depends, status
from datetime import timedelta
from bson import ObjectId
import os
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

load_dotenv()

from pydantic import BaseModel
from app.models import (
    UserCreate, UserLogin, UserResponse, PortfolioResponse, PositionResponse,
    OrderResponse, LeaderboardEntry, LeaderboardResponse, UserListEntry,
    UserListResponse, MakeAdminRequest, MarketIdeaCreate, MarketIdeaResponse,
    MarketIdeasListResponse, MarketIdeaVote, UpdateProfileRequest
)
from typing import Optional
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
            is_admin=False,
<<<<<<< HEAD
            held_balance=0.0
=======
            is_bot=False
>>>>>>> 1fae11b86fd3b4325bf1c9e1a7855a2ec3cf14e7
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
            is_admin=user.get("is_admin", False),
<<<<<<< HEAD
            held_balance=user.get("held_balance", 0.0)
=======
            is_bot=user.get("is_bot", False)
>>>>>>> 1fae11b86fd3b4325bf1c9e1a7855a2ec3cf14e7
        )
    }


class GoogleAuthRequest(BaseModel):
    credential: str


@router.post("/google")
async def google_auth(request: GoogleAuthRequest):
    """Authenticate with Google OAuth"""
    db = await get_database()

    try:
        # Verify the Google ID token
        google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not google_client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google OAuth not configured"
            )

        idinfo = id_token.verify_oauth2_token(
            request.credential,
            google_requests.Request(),
            google_client_id
        )

        email = idinfo.get("email")
        name = idinfo.get("name", email.split("@")[0])

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not get email from Google"
            )

        # Check if user exists
        user = await db.users.find_one({"email": email})

        if user:
            # User exists - log them in
            user_id = user["_id"]
            token_balance = user["token_balance"]
            is_admin = user.get("is_admin", False)
        else:
            # Create new user
            user_dict = {
                "email": email,
                "password_hash": None,  # No password for Google users
                "name": name,
                "token_balance": 1000.0,
                "is_admin": False,
                "created_at": datetime.utcnow(),
                "google_id": idinfo.get("sub")
            }
            result = await db.users.insert_one(user_dict)
            user_id = result.inserted_id
            token_balance = 1000.0
            is_admin = False

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_id)},
            expires_delta=access_token_expires
        )

        # Determine held_balance for the response
        if user:
            response_held_balance = user.get("held_balance", 0.0)
        else:
            response_held_balance = 0.0

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(
                id=str(user_id),
                email=email,
                name=name,
                token_balance=token_balance,
                is_admin=is_admin,
<<<<<<< HEAD
                held_balance=response_held_balance
=======
                is_bot=False
>>>>>>> 1fae11b86fd3b4325bf1c9e1a7855a2ec3cf14e7
            )
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        token_balance=current_user["token_balance"],
        is_admin=current_user.get("is_admin", False),
<<<<<<< HEAD
        held_balance=current_user.get("held_balance", 0.0)
=======
        is_bot=current_user.get("is_bot", False)
>>>>>>> 1fae11b86fd3b4325bf1c9e1a7855a2ec3cf14e7
    )


@router.put("/me", response_model=UserResponse)
async def update_profile(
    profile_data: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile (name)"""
    db = await get_database()

    if not profile_data.name or len(profile_data.name.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty"
        )

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"name": profile_data.name.strip()}}
    )

    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=profile_data.name.strip(),
        token_balance=current_user["token_balance"],
        is_admin=current_user.get("is_admin", False),
<<<<<<< HEAD
        held_balance=current_user.get("held_balance", 0.0)
=======
        is_bot=current_user.get("is_bot", False)
>>>>>>> 1fae11b86fd3b4325bf1c9e1a7855a2ec3cf14e7
    )


@router.delete("/me")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete current user's account and all associated data"""
    db = await get_database()
    user_id = current_user["_id"]

    # Delete user's positions
    await db.positions.delete_many({"user_id": user_id})

    # Cancel and delete user's open orders
    await db.orders.delete_many({"user_id": user_id})

    # Remove user from organization memberships
    await db.organization_members.delete_many({"user_id": user_id})

    # Delete user's notifications
    await db.notifications.delete_many({"user_id": user_id})

    # Delete user's market ideas
    await db.market_ideas.delete_many({"user_id": user_id})

    # Delete pool bet entries
    await db.pool_bet_entries.delete_many({"user_id": user_id})

    # Delete bet comments
    await db.bet_comments.delete_many({"user_id": user_id})

    # Finally, delete the user
    await db.users.delete_one({"_id": user_id})

    return {"message": "Account deleted successfully"}


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
                avg_no_price=pos["avg_no_price"],
                market_status=market.get("status", "active"),
                resolved_outcome=market.get("resolved_outcome"),
            ))

    # Get open orders
    orders_cursor = db.orders.find({
        "user_id": user_id,
        "status": {"$in": ["OPEN", "PARTIAL"]}
    }).sort("created_at", -1)

    open_orders_raw = []
    async for order in orders_cursor:
        open_orders_raw.append(order)

    market_ids = list({o["market_id"] for o in open_orders_raw})
    titles_by_mid = {}
    if market_ids:
        async for m in db.markets.find({"_id": {"$in": market_ids}}, {"title": 1}):
            titles_by_mid[m["_id"]] = m.get("title")

    open_orders = []
    for order in open_orders_raw:
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
            created_at=order["created_at"],
            market_title=titles_by_mid.get(order["market_id"]),
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

    # Get total count (excluding bots and admins)
    total = await db.users.count_documents(
        {"is_bot": {"$ne": True}, "is_admin": {"$ne": True}}
    )

    # Calculate skip value
    skip = (page - 1) * page_size

    # Aggregation pipeline to calculate total portfolio value
    pipeline = [
        # Filter out bots and admins (public leaderboard)
        {
            "$match": {
                "is_bot": {"$ne": True},
                "is_admin": {"$ne": True},
            }
        },
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
    include_bots: bool = False,
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

    # Build query - optionally filter out bots
    query = {} if include_bots else {"is_bot": {"$ne": True}}

    total = await db.users.count_documents(query)
    skip = (page - 1) * page_size

    cursor = db.users.find(query).sort("created_at", -1).skip(skip).limit(page_size)

    users = []
    async for user in cursor:
        users.append(UserListEntry(
            id=str(user["_id"]),
            email=user["email"],
            name=user["name"],
            is_admin=user.get("is_admin", False),
            is_bot=user.get("is_bot", False),
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


@router.get("/bots")
async def get_bot_accounts(
    current_user: dict = Depends(get_current_admin)
):
    """Get all bot accounts with their status (admin only)"""
    db = await get_database()

    # Find all bot accounts
    bots_cursor = db.users.find({"is_bot": True})
    bots = []

    async for bot in bots_cursor:
        bot_id = bot["_id"]

        # Get bot's positions
        positions_cursor = db.positions.find({"user_id": bot_id})
        positions = []
        total_position_value = 0.0

        async for pos in positions_cursor:
            market = await db.markets.find_one({"_id": pos["market_id"]})
            market_title = market["title"] if market else "Unknown Market"
            market_status = market["status"] if market else "unknown"

            yes_value = pos.get("yes_shares", 0) * pos.get("avg_yes_price", 0.5)
            no_value = pos.get("no_shares", 0) * pos.get("avg_no_price", 0.5)

            positions.append({
                "market_id": str(pos["market_id"]),
                "market_title": market_title,
                "market_status": market_status,
                "yes_shares": pos.get("yes_shares", 0),
                "no_shares": pos.get("no_shares", 0),
                "avg_yes_price": pos.get("avg_yes_price", 0),
                "avg_no_price": pos.get("avg_no_price", 0),
            })
            total_position_value += yes_value + no_value

        # Get bot's open orders count
        open_orders_count = await db.orders.count_documents({
            "user_id": bot_id,
            "status": {"$in": ["OPEN", "PARTIAL"]}
        })

        # Get bot's recent trades count (last 24 hours)
        from datetime import timedelta
        recent_trades_count = await db.trades.count_documents({
            "$or": [{"buyer_id": bot_id}, {"seller_id": bot_id}],
            "executed_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
        })

        bots.append({
            "id": str(bot_id),
            "name": bot["name"],
            "email": bot["email"],
            "token_balance": bot["token_balance"],
            "total_position_value": total_position_value,
            "positions": positions,
            "open_orders_count": open_orders_count,
            "recent_trades_24h": recent_trades_count,
            "created_at": bot.get("created_at", datetime.utcnow()).isoformat()
        })

    return {"bots": bots}


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
        "created_at": datetime.utcnow(),
        "likes": [],
        "dislikes": []
    }

    result = await db.market_ideas.insert_one(idea_dict)

    return MarketIdeaResponse(
        id=str(result.inserted_id),
        user_id=str(current_user["_id"]),
        user_name=current_user["name"],
        title=idea.title,
        description=idea.description,
        status="pending",
        created_at=idea_dict["created_at"],
        like_count=0,
        dislike_count=0,
        user_vote=None
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
        likes = idea.get("likes", [])
        dislikes = idea.get("dislikes", [])
        ideas.append(MarketIdeaResponse(
            id=str(idea["_id"]),
            user_id=str(idea["user_id"]),
            user_name=idea["user_name"],
            title=idea["title"],
            description=idea["description"],
            status=idea["status"],
            created_at=idea["created_at"],
            like_count=len(likes),
            dislike_count=len(dislikes),
            user_vote=None
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


# Public Market Ideas Endpoints

@router.get("/market-ideas/public", response_model=MarketIdeasListResponse)
async def list_public_market_ideas(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[str] = None
):
    """List all market ideas (public, no auth required)"""
    db = await get_database()

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

    # Sort by like_count (computed) - we'll sort by (likes - dislikes) count
    cursor = db.market_ideas.find(query).sort("created_at", -1).skip(skip).limit(page_size)

    ideas = []
    async for idea in cursor:
        likes = idea.get("likes", [])
        dislikes = idea.get("dislikes", [])
        ideas.append(MarketIdeaResponse(
            id=str(idea["_id"]),
            user_id=str(idea["user_id"]),
            user_name=idea["user_name"],
            title=idea["title"],
            description=idea["description"],
            status=idea["status"],
            created_at=idea["created_at"],
            like_count=len(likes),
            dislike_count=len(dislikes),
            user_vote=None  # No auth, so no user vote
        ))

    total_pages = (total + page_size - 1) // page_size

    return MarketIdeasListResponse(
        ideas=ideas,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/market-ideas/public/auth", response_model=MarketIdeasListResponse)
async def list_public_market_ideas_auth(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all market ideas with user's vote status (requires auth)"""
    db = await get_database()

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

    user_id = current_user["_id"]
    ideas = []
    async for idea in cursor:
        likes = idea.get("likes", [])
        dislikes = idea.get("dislikes", [])

        # Determine user's vote
        user_vote = None
        if user_id in likes:
            user_vote = "like"
        elif user_id in dislikes:
            user_vote = "dislike"

        ideas.append(MarketIdeaResponse(
            id=str(idea["_id"]),
            user_id=str(idea["user_id"]),
            user_name=idea["user_name"],
            title=idea["title"],
            description=idea["description"],
            status=idea["status"],
            created_at=idea["created_at"],
            like_count=len(likes),
            dislike_count=len(dislikes),
            user_vote=user_vote
        ))

    total_pages = (total + page_size - 1) // page_size

    return MarketIdeasListResponse(
        ideas=ideas,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("/market-ideas/{idea_id}/vote")
async def vote_on_market_idea(
    idea_id: str,
    vote_data: MarketIdeaVote,
    current_user: dict = Depends(get_current_user)
):
    """Vote (like/dislike) on a market idea"""
    db = await get_database()

    if not ObjectId.is_valid(idea_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid idea ID"
        )

    idea = await db.market_ideas.find_one({"_id": ObjectId(idea_id)})
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market idea not found"
        )

    user_id = current_user["_id"]
    likes = idea.get("likes", [])
    dislikes = idea.get("dislikes", [])

    # Remove from both lists first (to handle changing vote)
    if user_id in likes:
        likes.remove(user_id)
    if user_id in dislikes:
        dislikes.remove(user_id)

    # Add to appropriate list
    if vote_data.vote == "like":
        likes.append(user_id)
    else:
        dislikes.append(user_id)

    await db.market_ideas.update_one(
        {"_id": ObjectId(idea_id)},
        {"$set": {"likes": likes, "dislikes": dislikes}}
    )

    return {
        "message": f"Vote recorded: {vote_data.vote}",
        "like_count": len(likes),
        "dislike_count": len(dislikes),
        "user_vote": vote_data.vote
    }


@router.delete("/market-ideas/{idea_id}/vote")
async def remove_vote_on_market_idea(
    idea_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove vote from a market idea"""
    db = await get_database()

    if not ObjectId.is_valid(idea_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid idea ID"
        )

    idea = await db.market_ideas.find_one({"_id": ObjectId(idea_id)})
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market idea not found"
        )

    user_id = current_user["_id"]
    likes = idea.get("likes", [])
    dislikes = idea.get("dislikes", [])

    # Remove from both lists
    if user_id in likes:
        likes.remove(user_id)
    if user_id in dislikes:
        dislikes.remove(user_id)

    await db.market_ideas.update_one(
        {"_id": ObjectId(idea_id)},
        {"$set": {"likes": likes, "dislikes": dislikes}}
    )

    return {
        "message": "Vote removed",
        "like_count": len(likes),
        "dislike_count": len(dislikes),
        "user_vote": None
    }
