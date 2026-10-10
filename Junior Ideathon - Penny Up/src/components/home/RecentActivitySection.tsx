import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, History, Calendar, Check } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee, formatFriendlyDate } from '../../lib/utils';

export const RecentActivitySection: React.FC = () => {
  const { transactions, goals } = useSavingsStore();
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdraw'>('all');

  const filtered = transactions.filter((tx) => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  return (
    <section className="my-6 sm:my-8">
      {/* Header with quick filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight flex items-center gap-2">
            <span>Recent Activity</span>
            <span className="text-lg">📜</span>
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-ink-muted">
            All your real deposits and withdrawals
          </p>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200/80 shadow-xs self-start sm:self-auto">
          {(['all', 'deposit', 'withdraw'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${
                filter === f
                  ? 'bg-pup text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {f === 'all' ? 'All' : f === 'deposit' ? 'Added (+)' : 'Taken (-)'}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="card-white text-center py-8 text-ink-muted text-sm font-medium">
          No transactions found for this filter.
        </div>
      ) : (
        <div className="card-white p-2 divide-y divide-slate-100">
          {filtered.map((tx) => {
            const isDeposit = tx.type === 'deposit';
            const relatedGoal = tx.goal_id ? goals.find((g) => g.id === tx.goal_id) : null;

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50/70 rounded-2xl transition-colors"
              >
                {/* Left: Icon + Note + Date */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                      isDeposit
                        ? 'bg-mint-soft text-mint-dark border border-mint-border'
                        : 'bg-coralberry-soft text-coralberry-dark border border-coralberry/30'
                    }`}
                  >
                    {isDeposit ? (
                      <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-ink truncate">
                      {tx.note || (isDeposit ? 'Added savings' : 'Withdrew savings')}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-muted mt-0.5">
                      <span>{formatFriendlyDate(tx.created_date)}</span>
                      {relatedGoal && (
                        <>
                          <span>•</span>
                          <span className="truncate flex items-center gap-1 text-pup">
                            <span>{relatedGoal.emoji}</span>
                            <span>{relatedGoal.title}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount with Green for added, Coral for withdrawal */}
                <div className="text-right flex-shrink-0 pl-3">
                  <p
                    className={`text-sm sm:text-base font-black tracking-tight ${
                      isDeposit ? 'text-mint-dark' : 'text-coralberry-dark'
                    }`}
                  >
                    {isDeposit ? '+' : '−'} {formatRupee(tx.amount)}
                  </p>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      isDeposit ? 'bg-mint-soft text-mint-dark' : 'bg-coralberry-soft text-coralberry-dark'
                    }`}
                  >
                    {isDeposit ? 'Money Added' : 'Withdrawn'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
