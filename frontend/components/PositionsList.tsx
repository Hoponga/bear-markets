'use client';

import Link from 'next/link';
import type { Position } from '@/types';

interface PositionsListProps {
  positions: Position[];
}

function sortPositions(positions: Position[]): Position[] {
  return [...positions].sort((a, b) => {
    const statusA = a.market_status ?? 'active';
    const statusB = b.market_status ?? 'active';
    if (statusA !== statusB) {
      return statusA === 'active' ? -1 : 1;
    }
    return a.market_title.localeCompare(b.market_title);
  });
}

export default function PositionsList({ positions }: PositionsListProps) {
  if (positions.length === 0) {
    return (
      <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
        <p className="text-text-muted">You don't have any positions yet.</p>
        <Link
          href="/"
          className="mt-4 inline-block px-6 py-2 bg-btn-primary text-text-primary font-medium rounded-lg hover:bg-btn-primary-hover transition"
        >
          Browse Markets
        </Link>
      </div>
    );
  }

  const rows = sortPositions(positions);

  return (
    <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary overflow-hidden">
      <table className="min-w-full divide-y divide-border-primary">
        <thead className="bg-bg-hover">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
              Market
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
              Resolution
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
              YES Shares
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
              NO Shares
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
              Avg YES Price
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
              Avg NO Price
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-primary">
          {rows.map((position) => (
            <tr key={position.market_id} className="hover:bg-bg-hover">
              <td className="px-6 py-4 whitespace-nowrap">
                <Link
                  href={`/market/${position.market_id}`}
                  className="text-text-secondary hover:text-text-primary font-medium"
                >
                  {position.market_title}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {(position.market_status ?? 'active') === 'resolved' ? (
                  position.resolved_outcome ? (
                    <span
                      className={
                        position.resolved_outcome === 'YES'
                          ? 'font-medium text-green-400'
                          : 'font-medium text-red-400'
                      }
                    >
                      {position.resolved_outcome}
                    </span>
                  ) : (
                    <span className="text-text-muted">Resolved</span>
                  )
                ) : (
                  <span className="text-text-disabled">Open</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {position.yes_shares > 0 ? (
                  <span className="font-medium text-green-400">{position.yes_shares}</span>
                ) : (
                  <span className="text-text-disabled">0</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {position.no_shares > 0 ? (
                  <span className="font-medium text-red-400">{position.no_shares}</span>
                ) : (
                  <span className="text-text-disabled">0</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-text-secondary">
                ${position.avg_yes_price.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-text-secondary">
                ${position.avg_no_price.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
