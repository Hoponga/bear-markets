from fastapi import APIRouter, Depends
from typing import List
from bson import ObjectId
from datetime import datetime

from app.models import NotificationResponse, NotificationsListResponse
from app.auth import get_current_user
from app.database import get_database

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationsListResponse)
async def get_notifications(
    current_user: dict = Depends(get_current_user)
):
    """Get all notifications for the current user"""
    db = await get_database()

    notifications_cursor = db.notifications.find({
        "user_id": current_user["_id"]
    }).sort("created_at", -1).limit(50)

    notifications = []
    unread_count = 0

    async for notif in notifications_cursor:
        if not notif["read"]:
            unread_count += 1
        notifications.append(NotificationResponse(
            id=str(notif["_id"]),
            message=notif["message"],
            bet_id=str(notif["bet_id"]) if notif.get("bet_id") else None,
            organization_id=str(notif["organization_id"]) if notif.get("organization_id") else None,
            read=notif["read"],
            created_at=notif["created_at"]
        ))

    return NotificationsListResponse(
        notifications=notifications,
        unread_count=unread_count
    )


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    db = await get_database()

    if not ObjectId.is_valid(notification_id):
        return {"message": "Invalid notification ID"}

    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["_id"]},
        {"$set": {"read": True}}
    )

    return {"message": "Notification marked as read"}


@router.post("/read-all")
async def mark_all_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read"""
    db = await get_database()

    await db.notifications.update_many(
        {"user_id": current_user["_id"]},
        {"$set": {"read": True}}
    )

    return {"message": "All notifications marked as read"}
