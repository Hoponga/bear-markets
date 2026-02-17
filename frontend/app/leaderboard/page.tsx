'use client';

import { useState, useEffect } from 'react';
import { leaderboardAPI } from '@/lib/api';
import type { LeaderboardEntry, LeaderboardResponse } from '@/types';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadLeaderboard();
  }, [page]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data: LeaderboardResponse = await leaderboardAPI.get(page, pageSize);
      setEntries(data.entries);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err: any) {
      setError('Failed to load leaderboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  if (loading && entries.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-text-muted"></div>
          <p className="mt-4 text-text-muted">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-text-primary mb-2">Leaderboard</h1>
        <p className="text-lg text-text-muted">
          Top traders ranked by total portfolio value ({total} users total)
        </p>
      </div>

      {/* Leaderboard Table */}
      {entries.length > 0 ? (
        <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary overflow-hidden">
          <table className="min-w-full divide-y divide-border-primary">
            <thead className="bg-bg-hover">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">
                  Tokens
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">
                  Positions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-muted uppercase">
                  Total Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {entries.map((entry) => (
                <tr key={entry.user_id} className="hover:bg-bg-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        entry.rank === 1
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : entry.rank === 2
                          ? 'bg-btn-secondary text-text-secondary'
                          : entry.rank === 3
                          ? 'bg-orange-900/50 text-orange-400'
                          : 'bg-bg-hover text-text-muted'
                      }`}
                    >
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                    {entry.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-text-secondary">
                    ${entry.token_balance.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-text-secondary">
                    ${entry.position_value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span
                      className={`font-semibold ${
                        entry.total_value >= 1000
                          ? 'text-green-400'
                          : entry.total_value < 500
                          ? 'text-red-400'
                          : 'text-text-primary'
                      }`}
                    >
                      ${entry.total_value.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-bg-hover px-6 py-4 flex items-center justify-between border-t border-border-primary">
              <div className="text-sm text-text-muted">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                    page === 1
                      ? 'bg-btn-secondary text-text-disabled cursor-not-allowed'
                      : 'bg-btn-secondary border border-border-secondary text-text-secondary hover:bg-btn-secondary-hover'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                    page === totalPages
                      ? 'bg-btn-secondary text-text-disabled cursor-not-allowed'
                      : 'bg-btn-secondary border border-border-secondary text-text-secondary hover:bg-btn-secondary-hover'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-bg-card rounded-lg shadow-lg border border-border-primary p-8 text-center">
          <p className="text-text-muted">No users found.</p>
        </div>
      )}
    </div>
  );
}
