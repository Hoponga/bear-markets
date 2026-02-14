'use client';

import Link from 'next/link';
import type { Position } from '@/types';

interface PositionsListProps {
  positions: Position[];
}

export default function PositionsList({ positions }: PositionsListProps) {
  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">You don't have any positions yet.</p>
        <Link
          href="/"
          className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          Browse Markets
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Market
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              YES Shares
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              NO Shares
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Avg YES Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Avg NO Price
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {positions.map((position) => (
            <tr key={position.market_id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <Link
                  href={`/market/${position.market_id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {position.market_title}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                {position.yes_shares > 0 ? (
                  <span className="font-medium text-green-600">{position.yes_shares}</span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                {position.no_shares > 0 ? (
                  <span className="font-medium text-red-600">{position.no_shares}</span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                ${position.avg_yes_price.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                ${position.avg_no_price.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
