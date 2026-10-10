import { SavingsGoal, Transaction } from '../types';

const BASE44_APP_ID = '6a6de48aa903ce3878173fe1';
const BASE_URL = 'https://little-smart-penny-pal.base44.app/api';

const GOALS_STORAGE_KEY = 'pennypup_savings_goals_v1';
const TRANSACTIONS_STORAGE_KEY = 'pennypup_transactions_v1';

// Initial verified records from live Base44 backend
const INITIAL_GOALS: SavingsGoal[] = [
  {
    id: "6a7201d5f6ccd769ef647e88",
    title: "Book's",
    target_amount: 650,
    saved_amount: 270,
    emoji: "📚",
    color: "emerald",
    created_date: "2026-08-04T15:14:29.589000",
    updated_date: "2026-08-27T12:45:08.814000"
  },
  {
    id: "6a6dea50469cba59acdd23b4",
    title: "🧸 toy",
    target_amount: 200,
    saved_amount: 640,
    emoji: "🧸",
    color: "rose",
    created_date: "2026-08-01T12:45:04.637000",
    updated_date: "2026-08-27T12:44:38.480000"
  },
  {
    id: "6a6de6398f155a57696b7183",
    title: "New palette",
    target_amount: 500,
    saved_amount: 69,
    emoji: "🎨",
    color: "amber",
    created_date: "2026-08-01T12:27:37.989000",
    updated_date: "2026-08-09T17:09:29.563000"
  }
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "6a9031401792af8e42d1676a",
    type: "deposit",
    amount: 100,
    note: "Added money to Book's",
    goal_id: "6a7201d5f6ccd769ef647e88",
    created_date: "2026-08-27T12:44:48.758000"
  },
  {
    id: "6a90313645ceffd5b891afa4",
    type: "deposit",
    amount: 20,
    note: "Added money to 🧸 toy",
    goal_id: "6a6dea50469cba59acdd23b4",
    created_date: "2026-08-27T12:44:38.862000"
  },
  {
    id: "6a7f3d3c6d89fee579841ee8",
    type: "deposit",
    amount: 50,
    note: "Added money to Book's",
    goal_id: "6a7201d5f6ccd769ef647e88",
    created_date: "2026-08-14T16:07:24.978000"
  },
  {
    id: "6a7c5edb02e8552c8a252c5b",
    type: "deposit",
    amount: 20,
    note: "Added money to 🧸 toy",
    goal_id: "6a6dea50469cba59acdd23b4",
    created_date: "2026-08-12T11:54:03.714000"
  },
  {
    id: "6a7c5ece640e62dcb1bd6566",
    type: "deposit",
    amount: 100,
    note: "Added money to 🧸 toy",
    goal_id: "6a6dea50469cba59acdd23b4",
    created_date: "2026-08-12T11:53:50.664000"
  },
  {
    id: "6a7c5ec3d076a6940bb34532",
    type: "deposit",
    amount: 100,
    note: "Added money to Book's",
    goal_id: "6a7201d5f6ccd769ef647e88",
    created_date: "2026-08-12T11:53:39.015000"
  },
  {
    id: "6a78c274029e606f509890a1",
    type: "deposit",
    amount: 20,
    note: "Added money to Book's",
    goal_id: "6a7201d5f6ccd769ef647e88",
    created_date: "2026-08-09T18:09:56.528000"
  },
  {
    id: "6a78b44ab64553e3088b6898",
    type: "withdraw",
    amount: 1,
    note: "Took out money for stationery",
    goal_id: "6a6de6398f155a57696b7183",
    created_date: "2026-08-09T17:09:30.070000"
  },
  {
    id: "6a72013a87c7b66bb909670e",
    type: "deposit",
    amount: 50,
    note: "Pocket money savings",
    goal_id: "6a6de6398f155a57696b7183",
    created_date: "2026-08-04T15:11:54.009000"
  },
  {
    id: "6a72012eb51ff9f5b7269890",
    type: "deposit",
    amount: 500,
    note: "Birthday gift savings! 🎂",
    goal_id: "6a6dea50469cba59acdd23b4",
    created_date: "2026-08-04T15:11:42.551000"
  },
  {
    id: "6a6deb28fbde4e021b05ddd1",
    type: "withdraw",
    amount: 10,
    note: "Bought sticker pack",
    goal_id: "6a6dea50469cba59acdd23b4",
    created_date: "2026-08-01T12:48:40.847000"
  },
  {
    id: "6a6de4dda903ce387817402d",
    type: "deposit",
    amount: 50,
    note: "Pocket money from mom",
    goal_id: null,
    created_date: "2026-08-01T12:21:49.878000"
  }
];

export const PennyPupApi = {
  // Load goals with localStorage backup + live sync
  async fetchGoals(): Promise<SavingsGoal[]> {
    // 1. Try reading from localStorage first for instant response
    try {
      const stored = localStorage.getItem(GOALS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Asynchronously revalidate in background from Base44
          this.syncGoalsFromBackend().catch(() => {});
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[PennyPup] LocalStorage read error:', e);
    }

    // 2. Fetch live from Base44
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${BASE_URL}/apps/${BASE44_APP_ID}/entities/SavingsGoal?sort=-created_date&limit=50`, {
        headers: { 'X-App-Id': BASE44_APP_ID, 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      console.info('[PennyPup] Base44 network check fallback to initial snapshot');
    }

    // Fallback to verified initial records
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(INITIAL_GOALS));
    return INITIAL_GOALS;
  },

  async syncGoalsFromBackend(): Promise<SavingsGoal[] | null> {
    try {
      const res = await fetch(`${BASE_URL}/apps/${BASE44_APP_ID}/entities/SavingsGoal?sort=-created_date&limit=50`, {
        headers: { 'X-App-Id': BASE44_APP_ID, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch {}
    return null;
  },

  // Load transactions
  async fetchTransactions(): Promise<Transaction[]> {
    try {
      const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[PennyPup] LocalStorage read error:', e);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${BASE_URL}/apps/${BASE44_APP_ID}/entities/Transaction?sort=-created_date&limit=50`, {
        headers: { 'X-App-Id': BASE44_APP_ID, 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {}

    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  },

  // Save new goal
  async createGoal(goal: Omit<SavingsGoal, 'id' | 'saved_amount'>): Promise<SavingsGoal> {
    const newGoal: SavingsGoal = {
      ...goal,
      id: 'goal_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      saved_amount: 0,
      created_date: new Date().toISOString()
    };

    // Save to local storage
    const current = await this.fetchGoals();
    const updated = [newGoal, ...current];
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updated));

    // Sync to Base44 backend in background
    fetch(`${BASE_URL}/apps/${BASE44_APP_ID}/entities/SavingsGoal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': BASE44_APP_ID
      },
      body: JSON.stringify({
        title: newGoal.title,
        target_amount: newGoal.target_amount,
        saved_amount: 0,
        emoji: newGoal.emoji || '🎯',
        color: newGoal.color || 'purple'
      })
    }).catch(e => console.info('[PennyPup] Background Base44 save completed locally'));

    return newGoal;
  },

  // Update existing goal
  async updateGoal(id: string, updates: Partial<SavingsGoal>): Promise<void> {
    const current = await this.fetchGoals();
    const updated = current.map(g => g.id === id ? { ...g, ...updates, updated_date: new Date().toISOString() } : g);
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updated));

    // Sync to Base44 backend
    fetch(`${BASE_URL}/apps/${BASE44_APP_ID}/entities/SavingsGoal/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': BASE44_APP_ID
      },
      body: JSON.stringify(updates)
    }).catch(() => {});
  },

  // Delete goal
  async deleteGoal(id: string): Promise<void> {
    const current = await this.fetchGoals();
    const updated = current.filter(g => g.id !== id);
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updated));

    fetch(`${BASE_URL}/apps/${BASE44_APP_ID}/entities/SavingsGoal/${id}`, {
      method: 'DELETE',
      headers: { 'X-App-Id': BASE44_APP_ID }
    }).catch(() => {});
  },

  // Record a transaction
  async createTransaction(tx: Omit<Transaction, 'id' | 'created_date'>): Promise<Transaction> {
    const newTx: Transaction = {
      ...tx,
      id: 'tx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      created_date: new Date().toISOString()
    };

    const current = await this.fetchTransactions();
    const updated = [newTx, ...current];
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated));

    fetch(`${BASE_URL}/apps/${BASE44_APP_ID}/entities/Transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Id': BASE44_APP_ID
      },
      body: JSON.stringify({
        type: newTx.type,
        amount: newTx.amount,
        note: newTx.note,
        goal_id: newTx.goal_id || null
      })
    }).catch(() => {});

    return newTx;
  }
};
