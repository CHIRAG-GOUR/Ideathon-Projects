'use client';

import React, { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Emoji3D } from '@/components/ui/Emoji3D';

export const SEARCH_IDEAS = [
  { q: '2 aloo parathas with curd', label: 'Aloo paratha', e: '🫓' },
  { q: 'Veg thali with roti, dal, rice and sabzi', label: 'Veg thali', e: '🍛' },
  { q: 'Rajma chawal', label: 'Rajma chawal', e: '🍛' },
  { q: 'Masala dosa with sambar and chutney', label: 'Masala dosa', e: '🥞' },
  { q: 'Chicken biryani, 1 plate', label: 'Chicken biryani', e: '🍗' },
  { q: 'Penne arrabbiata', label: 'Pasta', e: '🍝' },
];

/** Type a food or a whole meal instead of taking a photo. */
export function SearchBox({ onSearch, autoFocus, compact }: { onSearch: (q: string) => void; autoFocus?: boolean; compact?: boolean }) {
  const [q, setQ] = useState('');
  const submit = (value: string) => {
    const v = value.trim();
    if (v.length >= 2) onSearch(v);
  };
  return (
    <div className="text-left" data-testid="search-box">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 ring-1 ring-inset ring-cloud-300 focus-within:ring-2 focus-within:ring-aqua-300"
        role="search"
      >
        <Search className="h-5 w-5 flex-none text-ink-muted" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, 200))}
          placeholder="e.g. 2 aloo parathas with curd"
          aria-label="Type a food or meal"
          autoFocus={autoFocus}
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink outline-none placeholder:text-ink-faint"
          data-testid="search-input"
        />
        <button type="submit" disabled={q.trim().length < 2} className="btn btn-primary h-10 w-10 min-h-0 flex-none p-0" aria-label="Look it up" data-testid="search-submit">
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Try one of these">
          {SEARCH_IDEAS.map((s) => (
            <button key={s.label} type="button" onClick={() => onSearch(s.q)} className="chip bg-cloud-100 py-1.5 pl-1.5 text-ink-soft ring-1 ring-inset ring-cloud-300 transition hover:bg-aqua-50" data-testid={`idea-${s.label}`}>
              <Emoji3D emoji={s.e} size={20} /> {s.label}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] font-semibold text-ink-muted">Works for single foods and whole meals — mention counts for better numbers.</p>
    </div>
  );
}
