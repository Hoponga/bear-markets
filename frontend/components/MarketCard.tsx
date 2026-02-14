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
      <div className="bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-700 p-6 cursor-pointer hover:border-gray-600">
        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2">
          {market.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-400 mb-4 line-clamp-2">
          {market.description}
        </p>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3">
            <p className="text-xs text-green-400 font-medium mb-1">YES</p>
            <p className="text-2xl font-bold text-green-400">{yesPrice}¢</p>
          </div>
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
            <p className="text-xs text-red-400 font-medium mb-1">NO</p>
            <p className="text-2xl font-bold text-red-400">{noPrice}¢</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Volume: ${market.total_volume.toFixed(0)}</span>
          <span className={market.status === 'active' ? 'text-green-400' : 'text-gray-500'}>
            {market.status === 'active' ? '● Active' : '○ Resolved'}
          </span>
        </div>
      </div>
    </Link>
  );
}
