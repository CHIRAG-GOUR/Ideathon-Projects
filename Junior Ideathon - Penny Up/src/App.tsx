import React, { useState } from 'react';
import { useSavingsStore } from './store/useSavingsStore';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { TotalSavingsCard } from './components/home/TotalSavingsCard';
import { SavingsStats } from './components/home/SavingsStats';
import { MyGoalsSection } from './components/home/MyGoalsSection';
import { ChoreAllowanceSection } from './components/home/ChoreAllowanceSection';
import { SavingsStreakWidget } from './components/home/SavingsStreakWidget';
import { SavingsCalculatorWidget } from './components/home/SavingsCalculatorWidget';
import { RecentActivitySection } from './components/home/RecentActivitySection';
import { GoalsView } from './components/goals/GoalsView';
import { ChoresView } from './components/chores/ChoresView';
import { CalculatorView } from './components/calculator/CalculatorView';
import { AddMoneyModal } from './components/modals/AddMoneyModal';
import { NewGoalModal } from './components/modals/NewGoalModal';
import { WithdrawModal } from './components/modals/WithdrawModal';
import { EditGoalModal } from './components/modals/EditGoalModal';
import { GoalCelebrationModal } from './components/modals/GoalCelebrationModal';
import { CertificateModal } from './components/modals/CertificateModal';
import { Toast } from './components/common/Toast';
import { SavingsGoal } from './types';
import { Sparkles } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { activeTab, totalSavings } = useSavingsStore();

  // Modal states
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [quickAmount, setQuickAmount] = useState<number | undefined>(undefined);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [selectedGoalForAction, setSelectedGoalForAction] = useState<SavingsGoal | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleOpenAddMoneyForGoal = (goal: SavingsGoal) => {
    setSelectedGoalForAction(goal);
    setQuickAmount(undefined);
    setIsAddMoneyOpen(true);
  };

  const handleQuickDeposit = (amount: number) => {
    setSelectedGoalForAction(null);
    setQuickAmount(amount);
    setIsAddMoneyOpen(true);
  };

  const handleOpenWithdrawForGoal = (goal: SavingsGoal) => {
    setSelectedGoalForAction(goal);
    setIsWithdrawOpen(true);
  };

  const handleOpenEditGoal = (goal: SavingsGoal) => {
    setSelectedGoalForAction(goal);
    setIsEditOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-cloud-100 text-ink selection:bg-brand-soft selection:text-brand-dark">
      {/* Global Notification Toast */}
      <Toast />

      {/* Fullscreen Sticky Website Header */}
      <Header
        onOpenAddMoney={() => {
          setSelectedGoalForAction(null);
          setQuickAmount(undefined);
          setIsAddMoneyOpen(true);
        }}
      />

      {/* Main Content Area - Fullscreen Responsive Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-5 sm:pt-6 pb-24 md:pb-12">
        {/* Tab 1: DASHBOARD / HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Friendly Mascot Welcome Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-cloud-300 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌟</span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-ink leading-tight">
                    Welcome Back, Little Saver!
                  </h2>
                  <p className="text-xs text-ink-muted font-medium mt-0.5">
                    "A penny saved today is a big dream achieved tomorrow!"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setIsNewGoalOpen(true)}
                  className="btn-mint text-xs py-2 px-3.5"
                >
                  <span>+ Set New Dream Goal</span>
                </button>
              </div>
            </div>

            {/* Overall Quick Stats Counters */}
            <SavingsStats />

            {/* Widescreen Multi-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (8 Columns on Large Screens) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Total Savings Hero Card */}
                <TotalSavingsCard
                  onOpenAddMoney={() => {
                    setSelectedGoalForAction(null);
                    setQuickAmount(undefined);
                    setIsAddMoneyOpen(true);
                  }}
                  onQuickDeposit={handleQuickDeposit}
                />

                {/* My Goals Section */}
                <MyGoalsSection
                  onOpenNewGoal={() => setIsNewGoalOpen(true)}
                  onOpenAddMoneyForGoal={handleOpenAddMoneyForGoal}
                  onOpenWithdrawForGoal={handleOpenWithdrawForGoal}
                  onOpenEditGoal={handleOpenEditGoal}
                />

                {/* Chores & Pocket Money Board */}
                <ChoreAllowanceSection />
              </div>

              {/* Right Sidebar Column (4 Columns on Large Screens) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Daily Habit Streak & Milestones */}
                <SavingsStreakWidget />

                {/* Smart Goal Planner / Calculator Widget */}
                <SavingsCalculatorWidget />

                {/* Recent Activity Ledger */}
                <RecentActivitySection />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: GOALS VIEW */}
        {activeTab === 'goals' && (
          <GoalsView
            onOpenNewGoal={() => setIsNewGoalOpen(true)}
            onOpenAddMoneyForGoal={handleOpenAddMoneyForGoal}
            onOpenWithdrawForGoal={handleOpenWithdrawForGoal}
            onOpenEditGoal={handleOpenEditGoal}
          />
        )}

        {/* Tab 3: CHORES & EARNING VIEW */}
        {activeTab === 'chores' && <ChoresView />}

        {/* Tab 4: SAVINGS CALCULATOR VIEW */}
        {activeTab === 'calculator' && <CalculatorView />}
      </main>

      {/* Mobile Fixed Navigation Bar */}
      <Navigation />

      {/* Modals */}
      {isAddMoneyOpen && (
        <AddMoneyModal
          initialGoal={selectedGoalForAction}
          initialAmount={quickAmount}
          onClose={() => {
            setIsAddMoneyOpen(false);
            setSelectedGoalForAction(null);
            setQuickAmount(undefined);
          }}
        />
      )}

      {isNewGoalOpen && (
        <NewGoalModal onClose={() => setIsNewGoalOpen(false)} />
      )}

      {isWithdrawOpen && selectedGoalForAction && (
        <WithdrawModal
          goal={selectedGoalForAction}
          onClose={() => {
            setIsWithdrawOpen(false);
            setSelectedGoalForAction(null);
          }}
        />
      )}

      {isEditOpen && selectedGoalForAction && (
        <EditGoalModal
          goal={selectedGoalForAction}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedGoalForAction(null);
          }}
        />
      )}

      {/* Celebration Modal when goal reaches 100% */}
      <GoalCelebrationModal />

      {/* Printable Champion Certificate Modal */}
      <CertificateModal />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
