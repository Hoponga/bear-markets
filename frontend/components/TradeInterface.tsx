'use client';

import { useState } from 'react';
import { ordersAPI } from '@/lib/api';
import { authStorage } from '@/lib/auth';

interface TradeInterfaceProps {
  marketId: string;
  onOrderPlaced?: () => void;
}

export default function TradeInterface({ marketId, onOrderPlaced }: TradeInterfaceProps) {
  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [executionType, setExecutionType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [price, setPrice] = useState('0.50');
  const [quantity, setQuantity] = useState('10');
  const [tokenAmount, setTokenAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const user = authStorage.getUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to place orders');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (executionType === 'MARKET') {
        const amount = parseFloat(tokenAmount);
        if (amount <= 0) {
          throw new Error('Amount must be positive');
        }

        const result = await ordersAPI.createMarketOrder(marketId, side, orderType, amount);
        setSuccess(result.message);
        onOrderPlaced?.();
      } else {
        const priceNum = parseFloat(price);
        const quantityNum = parseInt(quantity);

        if (priceNum <= 0 || priceNum >= 1) {
          throw new Error('Price must be between 0 and 1');
        }
        if (quantityNum <= 0) {
          throw new Error('Quantity must be positive');
        }

        await ordersAPI.create(marketId, side, orderType, priceNum, quantityNum);
        setSuccess(`${orderType} limit order placed successfully!`);
        setQuantity('10');
        onOrderPlaced?.();
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const estimatedCost = executionType === 'LIMIT'
    ? parseFloat(price) * parseInt(quantity || '0')
    : parseFloat(tokenAmount || '0');

  return (
    <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Place Order</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Execution Type Selection */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Order Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExecutionType('MARKET')}
              className={`py-2 px-4 rounded-lg font-medium transition ${
                executionType === 'MARKET'
                  ? 'bg-accent-purple text-text-primary'
                  : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'
              }`}
            >
              Market
            </button>
            <button
              type="button"
              onClick={() => setExecutionType('LIMIT')}
              className={`py-2 px-4 rounded-lg font-medium transition ${
                executionType === 'LIMIT'
                  ? 'bg-accent-purple text-text-primary'
                  : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'
              }`}
            >
              Limit
            </button>
          </div>
          <p className="text-xs text-text-disabled mt-1">
            {executionType === 'MARKET'
              ? 'Execute immediately at best available prices'
              : 'Set your own price, order waits until matched'}
          </p>
        </div>

        {/* Side Selection - Keep green/red */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Side</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('YES')}
              className={`py-2 px-4 rounded-lg font-medium transition ${
                side === 'YES'
                  ? 'bg-green-600 text-white'
                  : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => setSide('NO')}
              className={`py-2 px-4 rounded-lg font-medium transition ${
                side === 'NO'
                  ? 'bg-red-600 text-white'
                  : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Order Type Selection */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Action</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderType('BUY')}
              className={`py-2 px-4 rounded-lg font-medium transition ${
                orderType === 'BUY'
                  ? 'bg-btn-primary text-text-primary'
                  : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setOrderType('SELL')}
              className={`py-2 px-4 rounded-lg font-medium transition ${
                orderType === 'SELL'
                  ? 'bg-orange-600 text-white'
                  : 'bg-btn-secondary text-text-secondary hover:bg-btn-secondary-hover'
              }`}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Market Order Input */}
        {executionType === 'MARKET' && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              {orderType === 'BUY' ? 'Amount to Spend ($)' : 'Shares to Sell'}
            </label>
            <input
              type="number"
              step={orderType === 'BUY' ? '0.01' : '1'}
              min={orderType === 'BUY' ? '0.01' : '1'}
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
              required
            />
            <p className="text-xs text-text-disabled mt-1">
              {orderType === 'BUY'
                ? 'Will buy as many shares as possible with this amount'
                : 'Number of shares to sell at best available prices'}
            </p>
          </div>
        )}

        {/* Limit Order Inputs */}
        {executionType === 'LIMIT' && (
          <>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Limit Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
                required
              />
              <p className="text-xs text-text-disabled mt-1">Between $0.01 and $0.99</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Quantity (shares)
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2 bg-bg-input border border-border-secondary text-text-primary rounded-lg focus:ring-2 focus:ring-border-secondary focus:border-transparent placeholder-text-disabled"
                required
              />
            </div>
          </>
        )}

        {/* Estimated Cost/Value */}
        {orderType === 'BUY' && (
          <div className="bg-bg-hover border border-border-secondary rounded-lg p-3">
            <p className="text-sm text-text-secondary">
              <span className="font-medium">
                {executionType === 'MARKET' ? 'Budget:' : 'Max Cost:'}
              </span>{' '}
              ${estimatedCost.toFixed(2)}
            </p>
            {user && (
              <p className="text-xs text-text-muted mt-1">
                Your balance: ${user.token_balance.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-900/50 border border-green-700 rounded-lg p-3">
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !user}
          className="w-full py-3 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover disabled:bg-btn-secondary disabled:text-text-disabled transition"
        >
          {loading
            ? 'Processing...'
            : !user
            ? 'Sign In to Trade'
            : `${executionType === 'MARKET' ? 'Execute' : 'Place'} ${orderType} Order`}
        </button>
      </form>
    </div>
  );
}
