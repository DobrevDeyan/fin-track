"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { BudgetProgressBar } from "@/components/dashboard/BudgetProgressBar";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { AnomalyAlert } from "@/components/dashboard/AnomalyAlert";
// import { CashFlowForecast } from "@/components/dashboard/CashFlowForecast";
import { AIChatDrawer } from "@/components/dashboard/AIChatDrawer";
import { QuickExpenseFAB } from "@/components/dashboard/QuickExpenseFAB"
import { SectionErrorBoundary } from "@/components/dashboard/SectionErrorBoundary";
import { TransactionFilters } from "@/components/dashboard/TransactionFilters";
import { SalaryReminderNotification } from "@/components/SalaryReminderNotification";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { completeOnboarding } from "@/lib/firestore-users";
// Dashboard contexts
import { DashboardProvider } from "@/contexts/dashboard/DashboardProvider";
import { useSavingsContext } from "@/contexts/dashboard/SavingsContext";
import { useBudgetsContext } from "@/contexts/dashboard/BudgetsContext";
import { useRecurringContext } from "@/contexts/dashboard/RecurringContext";
import { useFinancialSummary } from "@/contexts/dashboard/FinancialSummaryContext";

// Custom hooks (still need entries for transactions table)
import { useEntries } from "@/lib/hooks/dashboard";

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
function DashboardInnerContent() {
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
        currentMonthSalary,
        balanceChange,
        incomeChange,
        expensesChange,
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

    // Handle checkout success redirect from Stripe
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("checkout") === "success") {
            toast.success("Subscription activated! Welcome to your new plan.");
            window.history.replaceState({}, "", "/dashboard");
        }
    }, []);

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
        const adjustedSpt = currentMonthExpenses - excludedExpenses;

        // If user has a profile budget set, use it as the ceiling.
        // Otherwise derive budget from income (income-based budgeting).
        const incomeDerivedBudget = currentMonthSalary + Math.max(0, currentMonthIncome - currentMonthSalary - excludedIncome);
        const adjustedBase = safeMonthlyBudget > 0 ? safeMonthlyBudget : incomeDerivedBudget;

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

                {/* Metrics Cards */}
                <div className="mb-8">
                    <SectionErrorBoundary label="Metrics">
                        <MetricsCards
                            totalBalance={globalBalance}
                            monthlyIncome={currentMonthIncome}
                            monthlySpending={Math.max(0, adjustedSpent)}
                            monthlyCashFlow={currentMonthIncome - Math.max(0, adjustedSpent)}
                            incomeChange={incomeChange}
                            spendingChange={expensesChange}
                            cashFlowChange={balanceChange}
                            userCurrency={userCurrency}
                        />
                    </SectionErrorBoundary>
                </div>

                {/* Health Score + Anomaly Alert */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <SectionErrorBoundary label="Health Score">
                        <HealthScoreCard />
                    </SectionErrorBoundary>
                    <SectionErrorBoundary label="Anomaly Alert">
                        <AnomalyAlert userCurrency={userCurrency} className="flex-1" />
                    </SectionErrorBoundary>
                </div>

                {/* Budget Progress - Now uses adjusted spent & budget */}
                {((monthlyBudget ?? 0) > 0 || currentMonthIncome > 0) && (
                    <div className="mb-8">
                        <SectionErrorBoundary label="Budget Progress">
                            <BudgetProgressBar
                              monthlyBudget={adjustedBaseBudget}
                              currentMonthExpenses={Math.max(0, adjustedSpent)}
                              userCurrency={userCurrency}
                            />
                        </SectionErrorBoundary>
                    </div>
                )}

                {/* Cash Flow Forecast */}
                {/* <div className="mb-8">
                    <CashFlowForecast userCurrency={userCurrency} />
                </div> */}

                {/* Transactions Table (still uses paginated entries for display) */}
                <SectionErrorBoundary label="Transactions">
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
                </SectionErrorBoundary>

                {/* Feature Sections - Tabbed Interface */}
                <Tabs defaultValue="savings" className="mt-8" ref={tabsRef} onValueChange={() => {
                    setTimeout(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0)
                }}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="savings" className="text-xs md:text-sm px-1 md:px-3">
                            {tSavings("tabLabel")} ({savingsAccounts.length})
                        </TabsTrigger>
                        <TabsTrigger value="budgets" className="text-xs md:text-sm px-1 md:px-3">
                            {tBudgets("tabLabel")} ({budgets.length})
                        </TabsTrigger>
                        <TabsTrigger value="recurring" className="text-xs md:text-sm px-1 md:px-3">
                            {tRecurring("tabLabel")} ({recurringTransactions.length})
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="savings">
                        <SectionErrorBoundary label="Savings">
                            <SavingsSection />
                        </SectionErrorBoundary>
                    </TabsContent>
                    <TabsContent value="budgets">
                        <SectionErrorBoundary label="Budgets">
                            <BudgetsSection entries={entriesHook.entries} categories={expenseCategories} />
                        </SectionErrorBoundary>
                    </TabsContent>
                    <TabsContent value="recurring">
                        <SectionErrorBoundary label="Recurring">
                            <RecurringSection categories={categories} />
                        </SectionErrorBoundary>
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
    const { user, loading } = useAuth();

    if (loading || !user) {
        return (
            <div className="container flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardProvider userId={user.uid}>
            <DashboardInnerContent />
        </DashboardProvider>
    );
}
