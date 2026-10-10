export interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  emoji: string;
  color?: string;
  deadline?: string | null;
  created_date?: string;
  updated_date?: string;
  created_by_id?: string;
  is_sample?: boolean;
}

export type TransactionType = 'deposit' | 'withdraw';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  note: string;
  goal_id?: string | null;
  created_date: string;
  updated_date?: string;
  created_by_id?: string;
  is_sample?: boolean;
}

export type ActiveTab = 'home' | 'goals' | 'chores' | 'calculator';

export interface ChoreItem {
  id: string;
  title: string;
  reward: number;
  emoji: string;
  category: 'room' | 'study' | 'pet' | 'help' | 'reading';
  completed: boolean;
  completed_at?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error' | 'celebrate';
  title: string;
  message: string;
}
