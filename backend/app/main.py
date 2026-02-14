from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import os
from dotenv import load_dotenv

from app.database import connect_to_mongo, close_mongo_connection
from app.routers import users, markets, orders
from app.websocket import sio

load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Berkeley Prediction Markets API",
    description="API for UC Berkeley prediction market platform",
    version="1.0.0"
)

# Configure CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router)
app.include_router(markets.router)
app.include_router(orders.router)

# Set Socket.IO reference in orders router
orders.set_sio(sio)


@app.on_event("startup")
async def startup_event():
    """Connect to MongoDB on startup"""
    await connect_to_mongo()
    print("Application started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown"""
    await close_mongo_connection()
    print("Application shutdown")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Berkeley Prediction Markets API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path='/socket.io'
)


# For running with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
