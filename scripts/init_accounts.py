#!/usr/bin/env python3
"""
Initialize admin and bot accounts in the database.

This script creates:
1. An initial admin account
2. An arbitrage bot account (marked as is_bot=True)

Environment variables (with defaults):
    MONGODB_URL - MongoDB connection string (default: mongodb://localhost:27017)
    DATABASE_NAME - Database name (default: berkeley_markets)
    ADMIN_EMAIL - Admin email (default: admin@bearmarket.local)
    ADMIN_PASSWORD - Admin password (default: AdminPassword123!)
    ADMIN_NAME - Admin display name (default: Admin)
    BOT_EMAIL - Bot email (default: arbitrage-bot@bearmarket.local)
    BOT_PASSWORD - Bot password (default: ArbitrageBot123!SecurePassword)
    BOT_NAME - Bot display name (default: Arbitrage Bot)
"""

import os
from datetime import datetime

import bcrypt
from pymongo import MongoClient


def get_password_hash(password: str) -> str:
    """Hash a password (bcrypt has a 72-byte limit)"""
    # Truncate password to 72 bytes for bcrypt compatibility
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def main():
    # Configuration from environment
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "berkeley_markets")

    admin_email = os.getenv("ADMIN_EMAIL", "admin@bearmarket.local")
    admin_password = os.getenv("ADMIN_PASSWORD", "AdminPassword123!")
    admin_name = os.getenv("ADMIN_NAME", "Admin")

    bot_email = os.getenv("BOT_EMAIL", "arbitrage-bot@bearmarket.local")
    bot_password = os.getenv("BOT_PASSWORD", "ArbitrageBot123!SecurePassword")
    bot_name = os.getenv("BOT_NAME", "Arbitrage Bot")

    print(f"Connecting to MongoDB at {mongodb_url}...")
    client = MongoClient(mongodb_url)
    db = client[database_name]
    users = db.users

    # Create admin account
    existing_admin = users.find_one({"email": admin_email})
    if existing_admin:
        print(f"Admin account already exists: {admin_email}")
        # Update to ensure is_admin is True
        users.update_one(
            {"email": admin_email},
            {"$set": {"is_admin": True}}
        )
        print(f"  Ensured is_admin=True")
    else:
        admin_doc = {
            "email": admin_email,
            "password_hash": get_password_hash(admin_password),
            "name": admin_name,
            "token_balance": 10000.0,  # Admin gets more tokens
            "is_admin": True,
            "is_bot": False,
            "created_at": datetime.utcnow()
        }
        users.insert_one(admin_doc)
        print(f"Created admin account: {admin_email}")

    # Create bot account
    existing_bot = users.find_one({"email": bot_email})
    if existing_bot:
        print(f"Bot account already exists: {bot_email}")
        # Update to ensure is_bot is True
        users.update_one(
            {"email": bot_email},
            {"$set": {"is_bot": True}}
        )
        print(f"  Ensured is_bot=True")
    else:
        bot_doc = {
            "email": bot_email,
            "password_hash": get_password_hash(bot_password),
            "name": bot_name,
            "token_balance": 100000.0,  # Bot gets lots of tokens for trading
            "is_admin": False,
            "is_bot": True,
            "created_at": datetime.utcnow()
        }
        users.insert_one(bot_doc)
        print(f"Created bot account: {bot_email}")

    print("\nInitialization complete!")
    print(f"\nAdmin login:")
    print(f"  Email: {admin_email}")
    print(f"  Password: {admin_password}")
    print(f"\nBot login:")
    print(f"  Email: {bot_email}")
    print(f"  Password: {bot_password}")

    client.close()


if __name__ == "__main__":
    main()
