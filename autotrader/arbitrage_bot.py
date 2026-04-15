#!/usr/bin/env python3
"""
Arbitrage Bot for Bear Markets Prediction Platform

This bot maintains market efficiency by:
1. Seeding new markets with initial positions (50 YES + 50 NO shares)
2. Exploiting minting arbitrage when best_ask_yes + best_ask_no < 0.99
3. Exploiting redemption arbitrage when best_bid_yes + best_bid_no > 1.01

Execution uses market orders (POST /api/orders/market) so the bot never holds multiple
resting limit orders per market—the API allows at most one active limit order per user per market.
"""

import asyncio
import os
import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field

import httpx
from dotenv import load_dotenv

load_dotenv()

# Configure logging - only show warnings and errors by default
log_level = os.getenv("LOG_LEVEL", "WARNING").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.WARNING),
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


@dataclass
class MarketPnL:
    """Track profit/loss for a single market"""
    market_id: str
    market_title: str
    tokens_spent: float = 0.0
    tokens_received: float = 0.0
    yes_shares: int = 0
    no_shares: int = 0
    minting_arb_count: int = 0
    redemption_arb_count: int = 0
    seeded: bool = False

    @property
    def realized_pnl(self) -> float:
        """P&L from completed trades (not including current positions)"""
        return self.tokens_received - self.tokens_spent

    def __str__(self) -> str:
        return (
            f"{self.market_title[:40]}: "
            f"Spent={self.tokens_spent:.2f}, Received={self.tokens_received:.2f}, "
            f"P&L={self.realized_pnl:+.2f}, "
            f"Positions(YES={self.yes_shares}, NO={self.no_shares}), "
            f"Arbs(mint={self.minting_arb_count}, redeem={self.redemption_arb_count})"
        )


@dataclass
class ArbitrageBot:
    """Main arbitrage bot class"""
    api_url: str
    bot_email: str
    bot_password: str
    seed_quantity: int = 50
    minting_threshold: float = 0.99  # Buy both if asks sum to less than this
    redemption_threshold: float = 1.01  # Sell both if bids sum to more than this
    poll_interval: int = 10  # seconds

    _token: Optional[str] = field(default=None, init=False)
    _client: Optional[httpx.AsyncClient] = field(default=None, init=False)
    _known_markets: set = field(default_factory=set, init=False)
    _market_pnl: dict = field(default_factory=dict, init=False)
    _running: bool = field(default=False, init=False)

    async def start(self):
        """Start the arbitrage bot"""
        logger.info("Starting Arbitrage Bot...")
        logger.info(f"API URL: {self.api_url}")
        logger.info(f"Minting threshold: {self.minting_threshold}")
        logger.info(f"Redemption threshold: {self.redemption_threshold}")
        logger.info(f"Poll interval: {self.poll_interval}s")

        self._client = httpx.AsyncClient(timeout=30.0)
        self._running = True

        # Authenticate
        if not await self._authenticate():
            logger.error("Failed to authenticate. Exiting.")
            return

        logger.info("Authentication successful!")

        # Main loop
        while self._running:
            try:
                await self._run_cycle()
            except Exception as e:
                logger.error(f"Error in cycle: {e}")

            await asyncio.sleep(self.poll_interval)

    async def stop(self):
        """Stop the bot gracefully"""
        logger.warning("Stopping bot...")
        self._running = False
        if self._client:
            await self._client.aclose()

    async def _authenticate(self) -> bool:
        """Authenticate with the backend and get JWT token"""
        max_retries = 30  # Wait up to 30 seconds for init to complete
        retry_delay = 1

        for attempt in range(max_retries):
            try:
                response = await self._client.post(
                    f"{self.api_url}/api/auth/login",
                    json={"email": self.bot_email, "password": self.bot_password}
                )

                if response.status_code == 200:
                    data = response.json()
                    self._token = data["access_token"]
                    logger.info(f"Logged in as: {data['user']['name']}")
                    return True

                if response.status_code == 401:
                    # Bot account not created yet by init script, wait and retry
                    if attempt < max_retries - 1:
                        logger.info(f"Bot account not ready, waiting... (attempt {attempt + 1}/{max_retries})")
                        await asyncio.sleep(retry_delay)
                        continue
                    else:
                        logger.error("Bot account not found. Make sure init script has run.")
                        return False

                logger.error(f"Authentication failed: {response.status_code} - {response.text}")
                return False

            except httpx.ConnectError:
                # Backend not ready yet, wait and retry
                if attempt < max_retries - 1:
                    logger.info(f"Backend not ready, waiting... (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    logger.error("Could not connect to backend after multiple retries")
                    return False
            except Exception as e:
                logger.error(f"Authentication error: {e}")
                return False

        return False

    def _get_headers(self) -> dict:
        """Get request headers with auth token"""
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json"
        }

    async def _get_markets(self) -> list:
        """Fetch all active markets"""
        try:
            response = await self._client.get(
                f"{self.api_url}/api/markets",
                params={"status_filter": "active"},
                headers=self._get_headers()
            )
            if response.status_code == 200:
                return response.json()
            logger.error(f"Failed to fetch markets: {response.status_code}")
            return []
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []

    async def _get_orderbook(self, market_id: str) -> Optional[dict]:
        """Fetch orderbook for a market"""
        try:
            response = await self._client.get(
                f"{self.api_url}/api/markets/{market_id}/orderbook",
                headers=self._get_headers()
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error fetching orderbook for {market_id}: {e}")
            return None

    async def _get_portfolio(self) -> Optional[dict]:
        """Fetch bot's portfolio"""
        try:
            response = await self._client.get(
                f"{self.api_url}/api/auth/portfolio",
                headers=self._get_headers()
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error fetching portfolio: {e}")
            return None

    async def _create_market_order(
        self,
        market_id: str,
        side: str,
        order_type: str,
        token_amount: float
    ) -> Optional[dict]:
        """Execute a market order (buy budget in tokens, or sell size in shares)."""
        try:
            response = await self._client.post(
                f"{self.api_url}/api/orders/market",
                json={
                    "market_id": market_id,
                    "side": side,
                    "order_type": order_type,
                    "token_amount": token_amount,
                },
                headers=self._get_headers(),
            )
            if response.status_code == 200:
                return response.json()
            logger.warning(f"Market order failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            logger.error(f"Error placing market order: {e}")
            return None

    async def _run_cycle(self):
        """Run one cycle of market scanning and arbitrage"""
        markets = await self._get_markets()

        for market in markets:
            market_id = market["id"]
            market_title = market["title"]

            # Initialize P&L tracking if new market
            if market_id not in self._market_pnl:
                self._market_pnl[market_id] = MarketPnL(
                    market_id=market_id,
                    market_title=market_title
                )

            pnl = self._market_pnl[market_id]

            # Seed new markets
            if market_id not in self._known_markets:
                self._known_markets.add(market_id)
                logger.info(f"New market discovered: {market_title}")
                await self._seed_market(market_id, pnl)

            # Check for arbitrage opportunities
            await self._check_arbitrage(market_id, market, pnl)

    async def _seed_market(self, market_id: str, pnl: MarketPnL):
        """Seed a new market with initial positions"""
        if pnl.seeded:
            return

        logger.info(f"Seeding market {pnl.market_title[:40]}...")

        # Get current orderbook to find prices
        orderbook = await self._get_orderbook(market_id)
        if not orderbook:
            logger.warning(f"Could not get orderbook for seeding")
            return

        # Use midpoint prices or default to 0.5
        yes_price = orderbook.get("midpoint_yes", 0.5)
        no_price = orderbook.get("midpoint_no", 0.5)

        # Place buy orders for YES shares
        # Buy at a price that ensures fill (use ask price or slightly above midpoint)
        yes_asks = orderbook.get("YES", {}).get("asks", [])
        yes_buy_price = yes_asks[0]["price"] if yes_asks else min(yes_price + 0.05, 0.95)

        yes_budget = yes_buy_price * self.seed_quantity
        result = await self._create_market_order(market_id, "YES", "BUY", yes_budget)
        if result:
            filled = result.get("shares_filled", 0)
            spent = result.get("tokens_spent", 0.0)
            pnl.tokens_spent += spent
            pnl.yes_shares += filled
            logger.info(f"  Bought {filled} YES (spent: {spent:.2f})")

        no_asks = orderbook.get("NO", {}).get("asks", [])
        no_buy_price = no_asks[0]["price"] if no_asks else min(no_price + 0.05, 0.95)

        no_budget = no_buy_price * self.seed_quantity
        result = await self._create_market_order(market_id, "NO", "BUY", no_budget)
        if result:
            filled = result.get("shares_filled", 0)
            spent = result.get("tokens_spent", 0.0)
            pnl.tokens_spent += spent
            pnl.no_shares += filled
            logger.info(f"  Bought {filled} NO (spent: {spent:.2f})")

        pnl.seeded = True

    async def _check_arbitrage(self, market_id: str, market: dict, pnl: MarketPnL):
        """Check and execute arbitrage opportunities"""
        # Get best bid/ask from market data
        yes_best_ask = market.get("yes_best_ask")
        no_best_ask = market.get("no_best_ask")
        yes_best_bid = market.get("yes_best_bid")
        no_best_bid = market.get("no_best_bid")

        # Check for minting arbitrage
        # If best_ask_yes + best_ask_no < 0.99, we can buy both and profit
        if yes_best_ask is not None and no_best_ask is not None:
            total_ask = yes_best_ask + no_best_ask
            if total_ask < self.minting_threshold:
                profit_margin = 1.0 - total_ask
                logger.info(
                    f"MINTING ARB: {pnl.market_title[:30]} - "
                    f"YES ask={yes_best_ask:.3f}, NO ask={no_best_ask:.3f}, "
                    f"sum={total_ask:.3f}, margin={profit_margin:.3f}"
                )
                await self._execute_minting_arbitrage(
                    market_id, yes_best_ask, no_best_ask, pnl
                )

        # Check for redemption arbitrage
        # If best_bid_yes + best_bid_no > 1.01, we can sell both and profit
        if yes_best_bid is not None and no_best_bid is not None:
            total_bid = yes_best_bid + no_best_bid
            if total_bid > self.redemption_threshold:
                profit_margin = total_bid - 1.0
                logger.info(
                    f"REDEMPTION ARB: {pnl.market_title[:30]} - "
                    f"YES bid={yes_best_bid:.3f}, NO bid={no_best_bid:.3f}, "
                    f"sum={total_bid:.3f}, margin={profit_margin:.3f}"
                )
                await self._execute_redemption_arbitrage(
                    market_id, yes_best_bid, no_best_bid, pnl
                )

    async def _execute_minting_arbitrage(
        self,
        market_id: str,
        yes_ask: float,
        no_ask: float,
        pnl: MarketPnL
    ):
        """Execute minting arbitrage by buying both YES and NO"""
        # Calculate how many shares we can reasonably buy
        # Start with a small quantity to test
        quantity = 10

        yes_budget = yes_ask * quantity
        result = await self._create_market_order(market_id, "YES", "BUY", yes_budget)
        yes_filled = 0
        if result:
            yes_filled = result.get("shares_filled", 0)
            cost = result.get("tokens_spent", 0.0)
            pnl.tokens_spent += cost
            pnl.yes_shares += yes_filled

        no_budget = no_ask * quantity
        result = await self._create_market_order(market_id, "NO", "BUY", no_budget)
        no_filled = 0
        if result:
            no_filled = result.get("shares_filled", 0)
            cost = result.get("tokens_spent", 0.0)
            pnl.tokens_spent += cost
            pnl.no_shares += no_filled

        if yes_filled > 0 or no_filled > 0:
            pnl.minting_arb_count += 1
            logger.info(
                f"  Executed: Bought {yes_filled} YES + {no_filled} NO"
            )

    async def _execute_redemption_arbitrage(
        self,
        market_id: str,
        yes_bid: float,
        no_bid: float,
        pnl: MarketPnL
    ):
        """Execute redemption arbitrage by selling both YES and NO"""
        # We need to have shares to sell
        # Get our current position
        portfolio = await self._get_portfolio()
        if not portfolio:
            return

        # Find our position in this market
        position = None
        for pos in portfolio.get("positions", []):
            if pos["market_id"] == market_id:
                position = pos
                break

        if not position:
            logger.info("  No position to sell for redemption arb")
            return

        yes_shares = position.get("yes_shares", 0)
        no_shares = position.get("no_shares", 0)

        # Can only sell min of what we have
        sellable = min(yes_shares, no_shares, 10)  # Cap at 10 to be safe

        if sellable <= 0:
            logger.info("  Insufficient balanced position for redemption arb")
            return

        result = await self._create_market_order(
            market_id, "YES", "SELL", float(sellable)
        )
        yes_sold = 0
        if result:
            yes_sold = result.get("shares_filled", 0)
            received = result.get("tokens_spent", 0.0)
            pnl.tokens_received += received
            pnl.yes_shares -= yes_sold

        result = await self._create_market_order(
            market_id, "NO", "SELL", float(sellable)
        )
        no_sold = 0
        if result:
            no_sold = result.get("shares_filled", 0)
            received = result.get("tokens_spent", 0.0)
            pnl.tokens_received += received
            pnl.no_shares -= no_sold

        if yes_sold > 0 or no_sold > 0:
            pnl.redemption_arb_count += 1
            logger.info(
                f"  Executed: Sold {yes_sold} YES + {no_sold} NO"
            )

async def main():
    """Main entry point"""
    # Get configuration from environment
    api_url = os.getenv("API_URL", "http://localhost:8000")
    bot_email = os.getenv("BOT_EMAIL", "arbitrage-bot@bearmarket.local")
    bot_password = os.getenv("BOT_PASSWORD", "ArbitrageBot123!SecurePassword")
    poll_interval = int(os.getenv("POLL_INTERVAL", "10"))
    seed_quantity = int(os.getenv("SEED_QUANTITY", "50"))
    minting_threshold = float(os.getenv("MINTING_THRESHOLD", "0.99"))
    redemption_threshold = float(os.getenv("REDEMPTION_THRESHOLD", "1.01"))

    bot = ArbitrageBot(
        api_url=api_url,
        bot_email=bot_email,
        bot_password=bot_password,
        seed_quantity=seed_quantity,
        minting_threshold=minting_threshold,
        redemption_threshold=redemption_threshold,
        poll_interval=poll_interval
    )

    try:
        await bot.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        await bot.stop()


if __name__ == "__main__":
    asyncio.run(main())
