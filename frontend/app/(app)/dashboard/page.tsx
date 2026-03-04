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
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { AnomalyAlert } from "@/components/dashboard/AnomalyAlert";
import { CashFlowForecast } from "@/components/dashboard/CashFlowForecast";
import { AIDigest } from "@/components/dashboard/AIDigest";
import { AIChatDrawer } from "@/components/dashboard/AIChatDrawer";
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
import { useRecurringContext } from "@/contexts/dashboard/RecurringContext";
import { useFinancialSummary } from "@/contexts/dashboard/FinancialSummaryContext";

// Custom hooks (still need entries for transactions table)
import { useEntries, type ToastState } from "@/lib/hooks/dashboard";

// Utilities
import { getUniqueCategories, getExpenseCategories } from "@/lib/categories";

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

// Lazy load receipt scanner (only needed when user clicks scan button)
const ReceiptScannerDialog = dynamic(() => import("@/components/dashboard/ReceiptScannerDialog").then((mod) => ({ default: mod.ReceiptScannerDialog })), { ssr: false });

/**
 * Inner dashboard content that uses the feature contexts
 */
function DashboardInnerContent({ onToast }: { onToast: (toast: ToastState) => void }) {
    const t = useTranslations("dashboard");
    const tSavings = useTranslations("savings");
    const tBudgets = useTranslations("budgets");
    const tRecurring = useTranslations("recurring");
    const { user } = useAuth();
    const { userCurrency, displayName, monthlyBudget, onboardingCompleted, refreshCurrency } = useCurrency();

    // Financial summary (single source of truth for metrics)
    const {
        totalBalance: globalBalance,
        currentMonthIncome,
        currentMonthExpenses,
        currentMonthBalance,
        currentMonthSalary,
        balanceChange,
        expensesChange,
        savingsChange: netSavingsChange,
        salaryChange,
        refreshSummary,
    } = useFinancialSummary();

    // Get data from contexts
    const { savingsAccounts, loadSavingsAccounts } = useSavingsContext();
    const { budgets, loadBudgets } = useBudgetsContext();
    const { recurringTransactions, loadRecurringTransactions } = useRecurringContext();

    // Receipt scanner state
    const [scannerDialogOpen, setScannerDialogOpen] = useState(false);

    // Track if initial load has happened
    const hasLoadedRef = useRef(false);
    const tabsRef = useRef<HTMLDivElement>(null);

    // Entries hook (manages transaction list for the table, NOT for metrics)
    const entriesHook = useEntries({
        userId: user?.uid,
        userCurrency,
        onToast,
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
            loadSavingsAccounts();
            refreshSummary();
        }
    }, [user, entriesHook.loadEntries, loadBudgets, loadRecurringTransactions, loadSavingsAccounts, refreshSummary]);

    // Memoized values
    const categories = useMemo(() => getUniqueCategories(entriesHook.entries), [entriesHook.entries]);
    const expenseCategories = useMemo(() => getExpenseCategories(), []);

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

    // Calculate adjusted budget taking into account ignored categories (active savings/goals)
    const { adjustedBaseBudget, adjustedSpent } = useMemo(() => {
        // Find categories to ignore (names of active savings)
        const ignoredCategories = new Set([
            ...activeSavingsAccounts.map(s => s.name),
        ]);

        let excludedExpenses = 0;
        let excludedIncome = 0;

        // Note: For a strictly month-accurate representation, we filter entries Hook's entries to the current month.
        // Quick approximation using the summary amounts: we check current month entries directly.
        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        entriesHook.entries.forEach(entry => {
            if (entry.date.startsWith(currentMonthPrefix) && ignoredCategories.has(entry.category)) {
                if (entry.type === 'expense') {
                    excludedExpenses += entry.amount;
                } else if (entry.type === 'income') {
                    excludedIncome += entry.amount;
                }
            }
        });

        const safeMonthlyBudget = monthlyBudget ?? 0;
        const discretionaryIncome = currentMonthIncome - currentMonthSalary - excludedIncome;
        const adjustedBase = currentMonthSalary + Math.max(0, discretionaryIncome);
        const adjustedSpt = currentMonthExpenses - excludedExpenses;

        return {
            adjustedBaseBudget: adjustedBase,
            adjustedSpent: adjustedSpt
        };
    }, [monthlyBudget, currentMonthIncome, currentMonthSalary, currentMonthExpenses, activeSavingsAccounts, entriesHook.entries]);

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

                {/* AI Monthly Digest */}
                <div className="mb-8">
                    <AIDigest />
                </div>

                {/* Metrics Cards - Now powered by financial summary (accurate across ALL entries) */}
                <div className="mb-8">
                    <MetricsCards
                        totalBalance={globalBalance}
                        netSavings={currentMonthBalance}
                        totalExpenses={currentMonthExpenses}
                        balanceChange={balanceChange}
                        savingsChange={netSavingsChange}
                        expensesChange={expensesChange}
                        userCurrency={userCurrency}
                    />
                </div>

                {/* Health Score + Anomaly Alert */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <HealthScoreCard />
                    <div className="flex-1">
                        <AnomalyAlert userCurrency={userCurrency} />
                    </div>
                </div>

                {/* Budget Progress - Now uses adjusted spent & budget */}
                {((monthlyBudget ?? 0) > 0 || currentMonthIncome > 0) && (
                    <div className="mb-8">
                        <BudgetProgressBar
                          monthlyBudget={adjustedBaseBudget}
                          currentMonthExpenses={Math.max(0, adjustedSpent)}
                          userCurrency={userCurrency}
                        />
                    </div>
                )}

                {/* Cash Flow Forecast */}
                <div className="mb-8">
                    <CashFlowForecast userCurrency={userCurrency} />
                </div>

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
                <Tabs defaultValue="savings" className="mt-8" ref={tabsRef} onValueChange={() => {
                    setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
                }}>
                    <TabsList className="grid w-full grid-cols-3">
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
                    </TabsList>
                    <TabsContent value="savings">
                        <SavingsSection userCurrency={userCurrency} />
                    </TabsContent>
                    <TabsContent value="budgets">
                        <BudgetsSection entries={entriesHook.entries} categories={expenseCategories} userCurrency={userCurrency} />
                    </TabsContent>
                    <TabsContent value="recurring">
                        <RecurringSection categories={categories} />
                    </TabsContent>
                </Tabs>

                {/* Add/Edit Entry Dialog */}
                <AddTransactionDialog 
                  open={entriesHook.dialogOpen} 
                  onOpenChange={entriesHook.handleDialogClose} 
                  onSubmit={entriesHook.handleAdd} 
                  editingEntry={entriesHook.editingEntry} 
                  savingsAccounts={activeSavingsAccounts}
                />

                {/* Receipt Scanner Dialog */}
                <ReceiptScannerDialog open={scannerDialogOpen} onOpenChange={setScannerDialogOpen} onSubmit={entriesHook.handleAdd} />

                {/* Quick Expense FAB */}
                <QuickExpenseFAB
                  onSubmit={entriesHook.handleAdd}
                  savingsAccounts={activeSavingsAccounts}
                />

                {/* AI Budget Coach Chat (floating) */}
                <AIChatDrawer />

                {/* Salary Reminder Notifications */}
                <SalaryReminderNotification entries={entriesHook.entries} />

                {/* Onboarding Screen */}
                {user && !onboardingCompleted && (
                    <OnboardingScreen
                        onComplete={async (data) => {
                            await completeOnboarding(user.uid, data);
                            await refreshCurrency();
                            // Refresh all dashboard data to pick up the new salary entry & recurring transaction
                            await refreshSummary();
                            await entriesHook.loadEntries();
                            await loadRecurringTransactions();
                            await loadBudgets();
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
            <DashboardInnerContent onToast={showToast} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </DashboardProvider>
    );
}
