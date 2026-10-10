import React, { useState } from 'react';
import { useSavingsStore } from './store/useSavingsStore';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { TotalSavingsCard } from './components/home/TotalSavingsCard';
import { SavingsStats } from './components/home/SavingsStats';
import { MyGoalsSection } from './components/home/MyGoalsSection';
import { RecentActivitySection } from './components/home/RecentActivitySection';
import { GoalsView } from './components/goals/GoalsView';
import { PremiumView } from './components/premium/PremiumView';
import { AddMoneyModal } from './components/modals/AddMoneyModal';
import { NewGoalModal } from './components/modals/NewGoalModal';
import { WithdrawModal } from './components/modals/WithdrawModal';
import { EditGoalModal } from './components/modals/EditGoalModal';
import { GoalCelebrationModal } from './components/modals/GoalCelebrationModal';
import { Toast } from './components/common/Toast';
import { SavingsGoal } from './types';

export const AppContent: React.FC = () => {
  const { activeTab, setActiveTab } = useSavingsStore();

  // Modal states
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [selectedGoalForAction, setSelectedGoalForAction] = useState<SavingsGoal | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleOpenAddMoneyForGoal = (goal: SavingsGoal) => {
    setSelectedGoalForAction(goal);
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
    <div className="min-h-screen flex flex-col bg-cloud-100 pb-20 sm:pb-10 selection:bg-pup-soft selection:text-pup">
      {/* Global Toast */}
      <Toast />

      {/* Top Sticky Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
        {/* Navigation Tabs (Top on Desktop, Bottom on Mobile) */}
        <Navigation />

        {/* Tab 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-2 animate-in fade-in duration-200">
            {/* Total Savings Card */}
            <TotalSavingsCard
              onOpenAddMoney={() => {
                setSelectedGoalForAction(null);
                setIsAddMoneyOpen(true);
              }}
            />

            {/* Savings Statistics */}
            <SavingsStats />

            {/* My Goals Section */}
            <MyGoalsSection
              onOpenNewGoal={() => setIsNewGoalOpen(true)}
              onOpenAddMoneyForGoal={handleOpenAddMoneyForGoal}
              onOpenWithdrawForGoal={handleOpenWithdrawForGoal}
              onOpenEditGoal={handleOpenEditGoal}
            />

            {/* Recent Activity Section */}
            <RecentActivitySection />
          </div>
        )}

        {/* Tab 2: GOALS */}
        {activeTab === 'goals' && (
          <GoalsView
            onOpenNewGoal={() => setIsNewGoalOpen(true)}
            onOpenAddMoneyForGoal={handleOpenAddMoneyForGoal}
            onOpenWithdrawForGoal={handleOpenWithdrawForGoal}
            onOpenEditGoal={handleOpenEditGoal}
          />
        )}

        {/* Tab 3: PREMIUM */}
        {activeTab === 'premium' && <PremiumView />}
      </main>

      {/* Modals */}
      {isAddMoneyOpen && (
        <AddMoneyModal
          initialGoal={selectedGoalForAction}
          onClose={() => {
            setIsAddMoneyOpen(false);
            setSelectedGoalForAction(null);
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
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
