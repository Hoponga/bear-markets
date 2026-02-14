'use client';

import Link from 'next/link';
import type { Market } from '@/types';

interface MarketCardProps {
  market: Market;
}

export default function MarketCard({ market }: MarketCardProps) {
  const yesPrice = (market.current_yes_price * 100).toFixed(1);
  const noPrice = (market.current_no_price * 100).toFixed(1);

  return (
    <Link href={`/market/${market.id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-6 cursor-pointer">
        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
          {market.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {market.description}
        </p>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-700 font-medium mb-1">YES</p>
            <p className="text-2xl font-bold text-green-600">{yesPrice}¢</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-700 font-medium mb-1">NO</p>
            <p className="text-2xl font-bold text-red-600">{noPrice}¢</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Volume: ${market.total_volume.toFixed(0)}</span>
          <span className={market.status === 'active' ? 'text-green-600' : 'text-gray-600'}>
            {market.status === 'active' ? '● Active' : '○ Resolved'}
          </span>
        </div>
      </div>
    </Link>
  );
}
