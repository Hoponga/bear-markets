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
  const [price, setPrice] = useState('0.50');
  const [quantity, setQuantity] = useState('10');
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
      const priceNum = parseFloat(price);
      const quantityNum = parseInt(quantity);

      if (priceNum <= 0 || priceNum >= 1) {
        throw new Error('Price must be between 0 and 1');
      }
      if (quantityNum <= 0) {
        throw new Error('Quantity must be positive');
      }

      await ordersAPI.create(marketId, side, orderType, priceNum, quantityNum);

      setSuccess(`${orderType} order placed successfully!`);
      setQuantity('10');
      onOrderPlaced?.();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const estimatedCost = parseFloat(price) * parseInt(quantity || '0');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Order</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Side Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Side</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('YES')}
              className={`py-2 px-4 rounded-lg font-medium transition ${
                side === 'YES'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Order Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderType('BUY')}
              className={`py-2 px-4 rounded-lg font-medium transition ${
                orderType === 'BUY'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Price Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Limit Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="0.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Between $0.01 and $0.99</p>
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity (shares)
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* Estimated Cost */}
        {orderType === 'BUY' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Max Cost:</span> ${estimatedCost.toFixed(2)}
            </p>
            {user && (
              <p className="text-xs text-blue-700 mt-1">
                Your balance: ${user.token_balance.toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !user}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Placing Order...' : !user ? 'Sign In to Trade' : `Place ${orderType} Order`}
        </button>
      </form>
    </div>
  );
}
