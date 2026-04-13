# UC Berkeley Prediction Markets

A full-stack prediction market platform for UC Berkeley students to trade YES/NO shares on various markets. Built with Next.js, FastAPI, MongoDB, and Socket.io for real-time updates.

## Features

### User Features
- **Account Creation**: New users start with 1000 tokens
- **Browse Markets**: View all active prediction markets
- **Place Limit Orders**: Buy or sell YES/NO shares at specific prices
- **Real-time Updates**: Live orderbook and price updates via WebSockets
- **Portfolio Management**: Track your positions and open orders

### Trading Mechanics
- **Orderbook-Based Pricing**: Prices determined by bid/ask spread midpoint
- **Share Minting**: When YES and NO buy orders sum to $1, new shares are minted
- **Limit Orders**: Full support for limit buy and sell orders
- **Automatic Matching**: Orders are automatically matched when prices cross

### Admin Features
- **Create Markets**: Admins can create new YES/NO markets
- **Resolve Markets**: Admins can resolve markets and trigger payouts

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** (Motor) - NoSQL database with async driver
- **Socket.io** - Real-time WebSocket communication
- **JWT Authentication** - Secure token-based auth
- **Bcrypt** - Password hashing

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io Client** - WebSocket client
- **Recharts** - Chart library for price history
- **Axios** - HTTP client

## Project Structure

```
markets/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── main.py         # FastAPI + Socket.io setup
│   │   ├── database.py     # MongoDB connection
│   │   ├── models.py       # Pydantic models
│   │   ├── auth.py         # JWT authentication
│   │   ├── routers/        # API endpoints
│   │   │   ├── users.py
│   │   │   ├── markets.py
│   │   │   └── orders.py
│   │   ├── services/       # Business logic
│   │   │   ├── orderbook.py
│   │   │   └── share_minting.py
│   │   └── websocket.py    # Socket.io handlers
│   └── requirements.txt
│
└── frontend/                # Next.js application
    ├── app/                # Pages (App Router)
    │   ├── page.tsx        # Home - market list
    │   ├── market/[id]/    # Market detail page
    │   ├── portfolio/      # User portfolio
    │   └── admin/          # Admin panel
    ├── components/         # React components
    ├── lib/                # Utilities
    │   ├── api.ts          # API client
    │   ├── socket.ts       # Socket.io client
    │   └── auth.ts         # Auth helpers
    └── types/              # TypeScript types
```

## Setup Instructions

### Prerequisites

- **Python 3.9+**
- **Node.js 18+**
- **MongoDB**
  - macOS: `brew install mongodb-community`
  - Linux: follow the [official MongoDB install guide](https://www.mongodb.com/docs/manual/installation/)
  - Or use Docker: `docker run -d -p 27017:27017 --name mongodb mongo:latest`
- **A Google OAuth app** — create one at [console.cloud.google.com](https://console.cloud.google.com). You'll need a Client ID and Client Secret. Add `http://localhost:3000` as an authorized origin and `http://localhost:3000` as a redirect URI.

### 1. Clone the repo

```bash
git clone <repo-url>
cd markets
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `backend/.env` file with the following (fill in your own values):

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=berkeley_markets
JWT_SECRET=<generate a long random string>
JWT_ALGORITHM=HS256
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<your Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth client secret>
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your Google OAuth client ID>
```

### 4. Start MongoDB

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 5. Run the servers

Open two terminals:

```bash
# Terminal 1 — backend
cd backend
source venv/bin/activate
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## Usage Guide

### Creating Your First Account

1. Open `http://localhost:3000`
2. Click "Sign In" in the top right
3. Click "Don't have an account? Sign up"
4. Enter your email, name, and password
5. You'll start with 1000 tokens!

### Creating a Market (Admin)

1. Create an admin account by directly modifying the database:
```bash
# Connect to MongoDB
mongosh

# Switch to database
use berkeley_markets

# Update a user to be admin
db.users.updateOne(
  { email: "your-email@berkeley.edu" },
  { $set: { is_admin: true } }
)
```

2. Navigate to `/admin`
3. Fill out the market creation form
4. Click "Create Market"

### Trading

1. Browse markets on the home page
2. Click on a market to view details
3. View the orderbooks on both sides (YES and NO)
4. Place a limit order:
   - Select side (YES or NO)
   - Select type (BUY or SELL)
   - Enter your limit price ($0.01 - $0.99)
   - Enter quantity
   - Click "Place Order"

### Share Minting Example

If you place a YES buy order at $0.60 and another user places a NO buy order at $0.40:
- The system will automatically mint shares
- You receive YES shares, they receive NO shares
- Your balance is debited $0.60 per share
- Their balance is debited $0.40 per share

### Viewing Your Portfolio

1. Click "Portfolio" in the navigation
2. View your:
   - Token balance
   - Open positions in markets
   - Open orders (with ability to cancel)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/portfolio` - Get user portfolio

### Markets
- `GET /api/markets` - List markets
- `GET /api/markets/{id}` - Get market details
- `GET /api/markets/{id}/orderbook` - Get orderbook
- `POST /api/markets` - Create market (admin)
- `POST /api/markets/{id}/resolve` - Resolve market (admin)

### Orders
- `POST /api/orders` - Place order
- `GET /api/orders/my-orders` - Get user's orders
- `DELETE /api/orders/{id}` - Cancel order

### WebSocket Events

**Client → Server:**
- `subscribe_market` - Subscribe to market updates
- `unsubscribe_market` - Unsubscribe from market

**Server → Client:**
- `orderbook_update` - Orderbook changed
- `trade_executed` - Trade occurred
- `portfolio_update` - User's portfolio changed

## Database Schema

### Collections

**users**
- email, password_hash, name
- token_balance (starts at 1000)
- is_admin (boolean)

**markets**
- title, description
- resolution_date, status
- current_yes_price, current_no_price
- total_volume

**orders**
- market_id, user_id
- side (YES/NO), order_type (BUY/SELL)
- price, quantity, filled_quantity
- status (OPEN/FILLED/CANCELLED/PARTIAL)

**positions**
- user_id, market_id
- yes_shares, no_shares
- avg_yes_price, avg_no_price

**trades**
- market_id, buyer_id, seller_id
- price, quantity, executed_at

## Design Philosophy

Inspired by Polymarket:
- **Minimalist UI**: Clean white backgrounds, subtle shadows
- **Price Focus**: Large, prominent price displays
- **Easy Trading**: Simple, intuitive order interface
- **Real-time Feel**: Smooth WebSocket updates
- **Mobile Responsive**: Works on all devices

## Development Notes

### Running Tests
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build
npm start

# Backend - use production WSGI server
pip install gunicorn
gunicorn app.main:socket_app -w 4 -k uvicorn.workers.UvicornWorker
```

### Common Issues

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check MONGODB_URL in `.env`

**CORS Error:**
- Verify FRONTEND_URL in backend `.env` matches your frontend URL
- Check that backend is running on port 8000

**WebSocket Not Connecting:**
- Ensure Socket.io server is running (check backend logs)
- Verify NEXT_PUBLIC_WS_URL is correct

## Future Enhancements

- [ ] Trade history with filters
- [ ] Market categories and search
- [ ] User profiles and leaderboards
- [ ] Email notifications for fills
- [ ] Mobile app
- [ ] Advanced charting (candlesticks, volume)
- [ ] Market maker incentives
- [ ] API rate limiting
- [ ] Two-factor authentication

## License

MIT License - Built for UC Berkeley

## Contributors

Built with Claude Code for UC Berkeley Prediction Markets

---

**Happy Trading!** 📊📈
