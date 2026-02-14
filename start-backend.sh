#!/bin/bash
cd backend
source venv/bin/activate
echo "🚀 Starting FastAPI backend on http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
