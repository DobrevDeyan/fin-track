"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { BudgetProgressBar } from "@/components/dashboard/BudgetProgressBar";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { QuickExpenseFAB } from "@/components/dashboard/QuickExpenseFAB";
import { TransactionFilters } from "@/components/dashboard/TransactionFilters";
import { SalaryReminderNotification } from "@/components/SalaryReminderNotification";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { Toast } from "@/components/ui/toast";
import { completeOnboarding } from "@/lib/firestore-users";
// Dashboard contexts
import { DashboardProvider } from "@/contexts/dashboard/DashboardProvider";
import { useSavingsContext } from "@/contexts/dashboard/SavingsContext";
import { useBudgetsContext } from "@/contexts/dashboard/BudgetsContext";
import { useGoalsContext } from "@/contexts/dashboard/GoalsContext";
import { useRecurringContext } from "@/contexts/dashboard/RecurringContext";
import { useFinancialSummary } from "@/contexts/dashboard/FinancialSummaryContext";

// Custom hooks (still need entries for transactions table)
import { useEntries, type ToastState } from "@/lib/hooks/dashboard";

// Utilities
import { getUniqueCategories } from "@/lib/categories";
import { calculateTotalSavings } from "@/lib/firestore-savings";

// Tabs
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Lazy load dialogs
const AddTransactionDialog = dynamic(() => import("@/components/dashboard/AddTransactionDialog").then((mod) => ({ default: mod.AddTransactionDialog })), {
    ssr: false
});

// Lazy load below-the-fold sections
const SavingsSection = dynamic(() => import("@/components/dashboard/sections/SavingsSection").then((mod) => ({ default: mod.SavingsSection })), { ssr: false });

const BudgetsSection = dynamic(() => import("@/components/dashboard/sections/BudgetsSection").then((mod) => ({ default: mod.BudgetsSection })), { ssr: false });

const RecurringSection = dynamic(() => import("@/components/dashboard/sections/RecurringSection").then((mod) => ({ default: mod.RecurringSection })), { ssr: false });

const GoalsSection = dynamic(() => import("@/components/dashboard/sections/GoalsSection").then((mod) => ({ default: mod.GoalsSection })), { ssr: false });

// Lazy load receipt scanner (only needed when user clicks scan button)
const ReceiptScannerDialog = dynamic(() => import("@/components/dashboard/ReceiptScannerDialog").then((mod) => ({ default: mod.ReceiptScannerDialog })), { ssr: false });

/**
 * Inner dashboard content that uses the feature contexts
 */
function DashboardInnerContent() {
    const t = useTranslations("dashboard");
    const tSavings = useTranslations("savings");
    const tBudgets = useTranslations("budgets");
    const tRecurring = useTranslations("recurring");
    const tGoals = useTranslations("goals");
    const { user } = useAuth();
    const { userCurrency, displayName, monthlyBudget, onboardingCompleted, refreshCurrency } = useCurrency();

    // Financial summary (single source of truth for metrics)
    const {
        currentMonthIncome: totalIncome,
        currentMonthExpenses: totalExpenses,
        currentMonthBalance: totalBalance,
        balanceChange,
        incomeChange,
        expensesChange,
        refreshSummary,
    } = useFinancialSummary();

    // Get data from contexts
    const { savingsAccounts, loadSavingsAccounts } = useSavingsContext();
    const { budgets, loadBudgets } = useBudgetsContext();
    const { goals, loadGoals } = useGoalsContext();
    const { recurringTransactions, loadRecurringTransactions } = useRecurringContext();

    // Toast state (shared across all features)
    const [toast, setToast] = useState<ToastState | null>(null);
    const showToast = useCallback((newToast: ToastState) => setToast(newToast), []);
    const clearToast = useCallback(() => setToast(null), []);

    // Receipt scanner state
    const [scannerDialogOpen, setScannerDialogOpen] = useState(false);

    // Track if initial load has happened
    const hasLoadedRef = useRef(false);

    // Entries hook (manages transaction list for the table, NOT for metrics)
    const entriesHook = useEntries({
        userId: user?.uid,
        userCurrency,
        onToast: showToast,
        onSavingsReload: loadSavingsAccounts,
        onSummaryRefresh: refreshSummary,
    });

    // Load all data when auth is ready
    useEffect(() => {
        if (user && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            entriesHook.loadEntries();
            loadBudgets();
            loadRecurringTransactions();
            loadGoals();
            loadSavingsAccounts();
            refreshSummary();
        }
    }, [user, entriesHook.loadEntries, loadBudgets, loadRecurringTransactions, loadGoals, loadSavingsAccounts, refreshSummary]);

    // Memoized values
    const categories = useMemo(() => getUniqueCategories(entriesHook.entries), [entriesHook.entries]);

    const totalSavingsAccounts = useMemo(() => calculateTotalSavings(savingsAccounts), [savingsAccounts]);

    const savingsChange = useMemo(() => {
        const activeSavingsCount = savingsAccounts.filter((acc) => acc.isActive).length;
        return {
            change: activeSavingsCount > 0 ? `Total across ${activeSavingsCount} account${activeSavingsCount !== 1 ? "s" : ""}` : "No savings accounts yet",
            trend: "neutral" as const
        };
    }, [savingsAccounts]);

    const activeSavingsAccounts = useMemo(
        () =>
            savingsAccounts
                .filter((acc) => acc.isActive)
                .map((acc) => ({
                    id: acc.id,
                    name: acc.name,
                    balance: acc.balance,
                    currency: acc.currency
                })),
        [savingsAccounts]
    );

    return (
        <div className="min-h-screen bg-background overflow-x-hidden">
            <div className="container py-8 px-4 sm:px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">{t("title")}</h1>
                        <p className="text-muted-foreground mt-2">{t("welcome", { name: displayName || user?.email?.split("@")[0] || "" })}</p>
                    </div>
                    <Button onClick={() => setScannerDialogOpen(true)}>
                        <ScanLine className="mr-2 h-4 w-4" />
                        {t("scanReceipt")}
                    </Button>
                </div>

                {/* Metrics Cards - Now powered by financial summary (accurate across ALL entries) */}
                <div className="mb-8">
                    <MetricsCards totalBalance={totalBalance} totalIncome={totalIncome} totalExpenses={totalExpenses} savings={totalSavingsAccounts} balanceChange={balanceChange} incomeChange={incomeChange} expensesChange={expensesChange} savingsChange={savingsChange} userCurrency={userCurrency} />
                </div>

                {/* Budget Progress - Now uses summary's current month expenses */}
                {((monthlyBudget ?? 0) > 0 || totalIncome > 0) && (
                    <div className="mb-8">
                        <BudgetProgressBar monthlyBudget={monthlyBudget ?? 0} currentMonthExpenses={totalExpenses} userCurrency={userCurrency} />
                    </div>
                )}

                {/* Transactions Table (still uses paginated entries for display) */}
                <TransactionsTable
                    transactions={entriesHook.filteredEntries.length > 0 ? entriesHook.filteredEntries : entriesHook.entries}
                    onAdd={() => entriesHook.setDialogOpen(true)}
                    onEdit={entriesHook.handleEdit}
                    onDelete={entriesHook.handleDelete}
                    filters={<TransactionFilters entries={entriesHook.entries} onFilterChange={entriesHook.setFilteredEntries} compact={true} />}
                    onLoadMore={entriesHook.loadMore}
                    hasMore={entriesHook.filteredEntries.length === 0 && entriesHook.hasMore}
                    isLoadingMore={entriesHook.isLoadingMore}
                />

                {/* Feature Sections - Tabbed Interface */}
                <Tabs defaultValue="savings" className="mt-8">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="savings" className="text-xs md:text-sm px-1 md:px-3">
                            <span className="md:hidden">Savings ({savingsAccounts.length})</span>
                            <span className="hidden md:inline">{tSavings("title")} ({savingsAccounts.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="budgets" className="text-xs md:text-sm px-1 md:px-3">
                            <span className="md:hidden">Budgets ({budgets.length})</span>
                            <span className="hidden md:inline">{tBudgets("title")} ({budgets.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="recurring" className="text-xs md:text-sm px-1 md:px-3">
                            <span className="md:hidden">Recurring ({recurringTransactions.length})</span>
                            <span className="hidden md:inline">{tRecurring("title")} ({recurringTransactions.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="goals" className="text-xs md:text-sm px-1 md:px-3">
                            <span className="md:hidden">Goals ({goals.length})</span>
                            <span className="hidden md:inline">{tGoals("title")} ({goals.length})</span>
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="savings">
                        <SavingsSection userCurrency={userCurrency} />
                    </TabsContent>
                    <TabsContent value="budgets">
                        <BudgetsSection entries={entriesHook.entries} categories={categories} userCurrency={userCurrency} />
                    </TabsContent>
                    <TabsContent value="recurring">
                        <RecurringSection categories={categories} />
                    </TabsContent>
                    <TabsContent value="goals">
                        <GoalsSection categories={categories} userCurrency={userCurrency} />
                    </TabsContent>
                </Tabs>

                {/* Add/Edit Entry Dialog */}
                <AddTransactionDialog open={entriesHook.dialogOpen} onOpenChange={entriesHook.handleDialogClose} onSubmit={entriesHook.handleAdd} editingEntry={entriesHook.editingEntry} savingsAccounts={activeSavingsAccounts} />

                {/* Receipt Scanner Dialog */}
                <ReceiptScannerDialog open={scannerDialogOpen} onOpenChange={setScannerDialogOpen} onSubmit={entriesHook.handleAdd} />

                {/* Quick Expense FAB */}
                <QuickExpenseFAB onSubmit={entriesHook.handleAdd} />

                {/* Salary Reminder Notifications */}
                <SalaryReminderNotification entries={entriesHook.entries} />

                {/* Toast Notification */}
                {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

                {/* Onboarding Screen */}
                {user && !onboardingCompleted && (
                    <OnboardingScreen
                        onComplete={async (data) => {
                            await completeOnboarding(user.uid, data);
                            await refreshCurrency();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();

    // Toast state for DashboardProvider
    const [toast, setToast] = useState<ToastState | null>(null);
    const showToast = useCallback((newToast: ToastState) => setToast(newToast), []);
    const clearToast = useCallback(() => setToast(null), []);

    if (!user) {
        return null;
    }

    return (
        <DashboardProvider userId={user.uid} onToast={showToast}>
            <DashboardInnerContent />
            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </DashboardProvider>
    );
}
