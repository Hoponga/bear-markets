from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "berkeley_markets")

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def get_database():
    return db.client[DATABASE_NAME]

async def connect_to_mongo():
    """Connect to MongoDB and create indexes"""
    db.client = AsyncIOMotorClient(MONGODB_URL)
    database = db.client[DATABASE_NAME]

    # Create indexes for better query performance
    await database.users.create_index([("email", ASCENDING)], unique=True)
    await database.markets.create_index([("status", ASCENDING)])
    await database.orders.create_index([("market_id", ASCENDING), ("status", ASCENDING)])
    await database.orders.create_index([("user_id", ASCENDING)])
    await database.positions.create_index([("user_id", ASCENDING), ("market_id", ASCENDING)], unique=True)
    await database.trades.create_index([("market_id", ASCENDING)])

    print("Connected to MongoDB")

async def close_mongo_connection():
    """Close MongoDB connection"""
    db.client.close()
    print("Closed MongoDB connection")
