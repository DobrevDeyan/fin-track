"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency, useMoney } from "@/contexts/CurrencyContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { Button } from "@/components/ui/button";
import { ScanLine, Users, User, Share2, UtensilsCrossed, ShoppingCart, Car, Zap, Calculator, Smile, Heart, GraduationCap, Plane, Gift, Briefcase, Wallet, CircleDot, BarChart3 } from "lucide-react";
import { MetricsCards, MetricsCardsSkeleton } from "@/components/dashboard/MetricsCards";
import { BudgetProgressBar } from "@/components/dashboard/BudgetProgressBar";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
const AchievementCard = dynamic(() => import("@/components/dashboard/AchievementCard").then(m => ({ default: m.AchievementCard })), { ssr: false });
import { AnomalyAlert } from "@/components/dashboard/AnomalyAlert";
import { HouseholdMemberBreakdown } from "@/components/dashboard/HouseholdMemberBreakdown";
const CashFlowForecast = dynamic(
  () => import("@/components/dashboard/CashFlowForecast").then(m => ({ default: m.CashFlowForecast })),
  { ssr: false, loading: () => <div className="h-[180px] w-full rounded-xl border bg-card animate-pulse" /> }
)
import { AIChatDrawer } from "@/components/dashboard/AIChatDrawer";
import { PullToRefresh } from "@/components/PullToRefresh";
import { SectionErrorBoundary } from "@/components/dashboard/SectionErrorBoundary";
import { TransactionFilters, type TransactionFilterCriteria } from "@/components/dashboard/TransactionFilters";
import { filterAndSortTransactions } from "@/lib/transaction-filters";
import { SalaryReminderNotification } from "@/components/SalaryReminderNotification";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { completeOnboarding } from "@/lib/firestore-users";
// Dashboard contexts
import { useSavingsContext } from "@/contexts/dashboard/SavingsContext";
import { useBudgetsContext } from "@/contexts/dashboard/BudgetsContext";
import { useRecurringContext } from "@/contexts/dashboard/RecurringContext";
import { useFinancialSummary } from "@/contexts/dashboard/FinancialSummaryContext";

// Custom hooks (still need entries for transactions table)
import { useEntries } from "@/lib/hooks/dashboard";

// Utilities
import { getUniqueCategories, getExpenseCategories } from "@/lib/categories"
import { getCategoryColor } from "@/lib/constants/category.constants"

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Food & Dining":      UtensilsCrossed,
  "Shopping":           ShoppingCart,
  "Transportation":     Car,
  "Bills & Utilities":  Zap,
  "Taxes & Insurance":  Calculator,
  "Entertainment":      Smile,
  "Health & Pharmacy":  Heart,
  "Education":          GraduationCap,
  "Travel & Vacation":  Plane,
  "Gifts & Donations":  Gift,
  "Salary":             Briefcase,
  "Goal Contribution":  Wallet,
  // Income categories (DEFAULT_INCOME_CATEGORIES) — see review M4.
  "Freelance":          Wallet,
  "Investment":         BarChart3,
  "Gift":               Gift,
  "Other":              CircleDot,
}
import { useUIMode } from "@/contexts/UIComplexityContext";

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

const HouseholdBudgetsSection = dynamic(() => import("@/components/dashboard/sections/HouseholdBudgetsSection").then((mod) => ({ default: mod.HouseholdBudgetsSection })), { ssr: false });
const HouseholdGoalsSection = dynamic(() => import("@/components/dashboard/sections/HouseholdGoalsSection").then((mod) => ({ default: mod.HouseholdGoalsSection })), { ssr: false });

// Lazy load receipt scanner (only needed when user clicks scan button)
const ReceiptScannerDialog = dynamic(() => import("@/components/dashboard/ReceiptScannerDialog").then((mod) => ({ default: mod.ReceiptScannerDialog })), { ssr: false });

// Lazy load CSV import dialog
const CSVImportDialog = dynamic(() => import("@/components/dashboard/CSVImportDialog").then((mod) => ({ default: mod.CSVImportDialog })), { ssr: false });

/**
 * Inner dashboard content that uses the feature contexts
 */
function DashboardInnerContent() {
    const t = useTranslations("dashboard");
    const tSavings = useTranslations("savings");
    const tBudgets = useTranslations("budgets");
    const tRecurring = useTranslations("recurring");
    const tHousehold = useTranslations("household");
    const { user } = useAuth();
    const { mode } = useUIMode();
    const { userCurrency, displayName, monthlyBudget, onboardingCompleted, refreshCurrency, loading: currencyLoading } = useCurrency();
    const { format: formatMoney } = useMoney();
    const { householdId, household, isHouseholdMode, setIsHouseholdMode, householdEntries, householdEntriesLoading, householdEntriesError, refreshHouseholdEntries } = useHousehold();

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
        loading: summaryLoading,
    } = useFinancialSummary();

    // Get data from contexts
    const { savingsAccounts, loadSavingsAccounts, ensureSavingsLoaded } = useSavingsContext();
    const { budgets, loadBudgets, ensureBudgetsLoaded } = useBudgetsContext();
    const { recurringTransactions, loadRecurringTransactions, ensureRecurringLoaded } = useRecurringContext();



    // Receipt scanner state
    const [scannerDialogOpen, setScannerDialogOpen] = useState(false);

    // CSV import state
    const [csvImportOpen, setCsvImportOpen] = useState(false);

    // Achievement card share
    const [shareCardOpen, setShareCardOpen] = useState(false);

    // Tabs state with direction tracking
    const TAB_ORDER = ["savings", "budgets", "recurring"] as const;
    type TabValue = typeof TAB_ORDER[number];
    const [activeTab, setActiveTab] = useState<TabValue>("savings");

    const handleTabChange = useCallback((val: string) => {
        setActiveTab(val as TabValue);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            });
        });
    }, []);

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

    // The transactions filter UI reports its criteria here; the visible list is
    // derived from the single `entries` source. When no filter UI is mounted
    // (non-full mode) criteria stays null and we show all loaded entries. When a
    // filter is active but matches nothing, the derived list is correctly empty
    // (no fallback to the full list — see review C1).
    const [filterCriteria, setFilterCriteria] = useState<TransactionFilterCriteria | null>(null);
    const isFiltering = filterCriteria?.hasActiveFilters ?? false;
    const { allEntries, loadAllEntries, loadingAllEntries } = entriesHook;

    // When a filter is active, search the full history (loaded lazily) instead
    // of only the paginated page, so older transactions are searchable (M1).
    useEffect(() => {
        if (isFiltering && !allEntries && !loadingAllEntries) {
            loadAllEntries();
        }
    }, [isFiltering, allEntries, loadingAllEntries, loadAllEntries]);

    // Filter over the full history once it's loaded; otherwise the paginated list.
    const filterSource = isFiltering && allEntries ? allEntries : entriesHook.entries;
    const visibleTransactions = useMemo(() => {
        if (!filterCriteria) return entriesHook.entries;
        return filterAndSortTransactions(
            filterSource,
            filterCriteria.options,
            filterCriteria.sortBy
        );
    }, [filterSource, filterCriteria, entriesHook.entries]);

    // While the full history is still loading for an active filter, show a
    // loading state rather than a premature "no results".
    const isFilterResultsLoading = isFiltering && loadingAllEntries && !allEntries;

    // Load all data when auth is ready
    useEffect(() => {
        if (user && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            entriesHook.loadEntries();
            ensureBudgetsLoaded();
            ensureRecurringLoaded();
            ensureSavingsLoaded();
            refreshSummary();
        }
    }, [user, entriesHook.loadEntries, ensureBudgetsLoaded, ensureRecurringLoaded, ensureSavingsLoaded, refreshSummary]);

    // Refresh the transactions list when the global quick-add sheet (mounted in
    // the app layout) records a new entry while this page is open
    useEffect(() => {
        const handler = () => { entriesHook.loadEntries() }
        window.addEventListener("pocket:entriesChanged", handler)
        return () => window.removeEventListener("pocket:entriesChanged", handler)
    }, [entriesHook.loadEntries])

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

    const handleRefresh = useCallback(async () => {
        await Promise.all([
            entriesHook.loadEntries(),
            refreshSummary(),
            loadBudgets(),
            loadSavingsAccounts(),
            loadRecurringTransactions(),
        ])
    }, [entriesHook.loadEntries, refreshSummary, loadBudgets, loadSavingsAccounts, loadRecurringTransactions])

    return (
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-background overflow-x-hidden">
            <div className="container py-8 px-4 sm:px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">{t("title")}</h1>
                        <p className="text-muted-foreground mt-2">{t("welcome", { name: displayName || user?.email?.split("@")[0] || "" })}</p>
                    </div>
                    {mode === "full" && (
                    <div className="flex items-center gap-2">
                        {householdId && (
                            <div className="flex items-center rounded-lg border bg-muted p-0.5 gap-0.5">
                                <button
                                    onClick={() => setIsHouseholdMode(false)}
                                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                        !isHouseholdMode
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <User className="h-3.5 w-3.5" />
                                    {tHousehold("personal")}
                                </button>
                                <button
                                    onClick={() => setIsHouseholdMode(true)}
                                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                        isHouseholdMode
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <Users className="h-3.5 w-3.5" />
                                    {tHousehold("family")}
                                </button>
                            </div>
                        )}
                        <Button onClick={() => setScannerDialogOpen(true)}>
                            <ScanLine className="mr-2 h-4 w-4" />
                            {t("scanReceipt")}
                        </Button>
                    </div>
                    )}
                </div>

                {/* Metrics Cards */}
                <div className="mb-8">
                    <SectionErrorBoundary label="Metrics">
                        {summaryLoading ? (
                            <MetricsCardsSkeleton />
                        ) : (
                            <MetricsCards
                                totalBalance={globalBalance}
                                monthlyIncome={currentMonthIncome}
                                monthlySpending={Math.max(0, adjustedSpent)}
                                monthlyCashFlow={currentMonthIncome - Math.max(0, adjustedSpent)}
                                incomeChange={incomeChange}
                                spendingChange={expensesChange}
                                cashFlowChange={balanceChange}
                            />
                        )}
                    </SectionErrorBoundary>
                </div>

                {/* Health Score + Anomaly Alert — full mode only */}
                {mode === "full" && (
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <SectionErrorBoundary label="Health Score">
                        <div className="relative flex-1">
                            <HealthScoreCard />
                            <button
                                onClick={() => setShareCardOpen(true)}
                                className="absolute top-2 right-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                title={t("shareStats")}
                            >
                                <Share2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </SectionErrorBoundary>
                    <SectionErrorBoundary label="Anomaly Alert">
                        <AnomalyAlert userCurrency={userCurrency} className="flex-1" />
                    </SectionErrorBoundary>
                </div>
                )}

                {/* Budget Progress - Now uses adjusted spent & budget */}
                {((monthlyBudget ?? 0) > 0 || currentMonthIncome > 0) && (
                    <div className="mb-8">
                        <SectionErrorBoundary label="Budget Progress">
                            <BudgetProgressBar
                              monthlyBudget={adjustedBaseBudget}
                              currentMonthExpenses={Math.max(0, adjustedSpent)}
                            />
                        </SectionErrorBoundary>
                    </div>
                )}

                {/* Cash Flow Forecast — full mode only */}
                {mode === "full" && (
                <div className="mb-8">
                    <SectionErrorBoundary label="Cash Flow Forecast">
                        <CashFlowForecast userCurrency={userCurrency} />
                    </SectionErrorBoundary>
                </div>
                )}

                {/* Transactions — Personal or Family view */}
                {isHouseholdMode && householdId ? (
                    <SectionErrorBoundary label="Family Transactions">
                        <div className="rounded-xl border bg-card">
                            <div className="flex items-center justify-between px-4 py-3 border-b">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">{tHousehold("familyTransactions")}</span>
                                    {household && (
                                        <span className="text-xs text-muted-foreground">— {household.name}</span>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={refreshHouseholdEntries}
                                    disabled={householdEntriesLoading}
                                >
                                    {householdEntriesLoading ? tHousehold("loading") : tHousehold("refresh")}
                                </Button>
                            </div>

                            {!householdEntriesLoading && householdEntries.length > 0 && (
                                <HouseholdMemberBreakdown
                                    entries={householdEntries}
                                    userCurrency={userCurrency}
                                />
                            )}

                            {householdEntriesLoading ? (
                                <div className="divide-y">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="px-4 py-3 flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                                                <div className="h-2.5 w-20 bg-muted animate-pulse rounded" />
                                            </div>
                                            <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : householdEntriesError ? (
                                <div className="flex flex-col items-center justify-center py-12 text-sm text-destructive gap-2">
                                    <p>{householdEntriesError}</p>
                                    <button
                                        className="text-xs underline text-muted-foreground hover:text-foreground"
                                        onClick={() => refreshHouseholdEntries()}
                                    >
                                        {tHousehold("tryAgain")}
                                    </button>
                                </div>
                            ) : householdEntries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                                    <Users className="h-8 w-8 mb-2 opacity-40" />
                                    {tHousehold("noTransactions")}
                                </div>
                            ) : (
                                <div className="divide-y max-h-[520px] overflow-y-auto">
                                    {householdEntries.map((entry) => (
                                        <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                                            {(() => {
                                                const Icon = CATEGORY_ICONS[entry.category] ?? CircleDot
                                                return (
                                                    <span className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${getCategoryColor(entry.category)}`}>
                                                        <Icon className="h-3.5 w-3.5" />
                                                    </span>
                                                )
                                            })()}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{entry.description}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-xs text-muted-foreground">{entry.category}</span>
                                                    <span className="text-xs text-muted-foreground">·</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(entry.date).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{entry.memberDisplayName}</span>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-semibold shrink-0 ${
                                                entry.type === "income"
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-rose-600 dark:text-rose-400"
                                            }`}>
                                                {entry.type === "income" ? "+" : "−"}
                                                {formatMoney(entry.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </SectionErrorBoundary>
                ) : (
                <SectionErrorBoundary label="Transactions">
                    <TransactionsTable
                        transactions={visibleTransactions}
                        onAdd={() => entriesHook.setDialogOpen(true)}
                        onEdit={entriesHook.handleEdit}
                        onDelete={entriesHook.handleDelete}
                        onImportCSV={() => setCsvImportOpen(true)}
                        filters={mode === "full" ? <TransactionFilters entries={entriesHook.entries} onFilterChange={setFilterCriteria} compact={true} /> : undefined}
                        hasActiveFilters={mode === "full" && isFiltering}
                        isResultsLoading={isFilterResultsLoading}
                        onLoadMore={entriesHook.loadMore}
                        hasMore={isFiltering ? false : entriesHook.hasMore}
                        isLoadingMore={entriesHook.isLoadingMore}
                    />
                </SectionErrorBoundary>
                )}

                {/* Household shared budget + goals — family mode, full mode only */}
                {mode === "full" && isHouseholdMode && householdId && (
                <div className="mt-8 space-y-8">
                    <div className="rounded-xl border bg-card">
                        <div className="flex items-center gap-2 px-4 py-3 border-b">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{tHousehold("sharedBudget")}</span>
                            {household && <span className="text-xs text-muted-foreground">— {household.name}</span>}
                        </div>
                        <div className="px-4">
                            <SectionErrorBoundary label="Household Budgets">
                                <HouseholdBudgetsSection
                                    householdEntries={householdEntries}
                                    categories={expenseCategories}
                                />
                            </SectionErrorBoundary>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-card">
                        <div className="flex items-center gap-2 px-4 py-3 border-b">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{tHousehold("sharedGoals")}</span>
                            {household && <span className="text-xs text-muted-foreground">— {household.name}</span>}
                        </div>
                        <div className="px-4">
                            <SectionErrorBoundary label="Household Goals">
                                <HouseholdGoalsSection
                                    categories={expenseCategories}
                                    userCurrency={userCurrency}
                                />
                            </SectionErrorBoundary>
                        </div>
                    </div>
                </div>
                )}

                {/* Feature Sections - Tabbed Interface — full mode only */}
                {mode === "full" && (
                <div className="mt-8" ref={tabsRef}>
                    <Tabs value={activeTab} onValueChange={handleTabChange}>
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
                        <TabsContent value="savings" className="mt-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200">
                            <SectionErrorBoundary label="Savings">
                                <SavingsSection />
                            </SectionErrorBoundary>
                        </TabsContent>
                        <TabsContent value="budgets" className="mt-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200">
                            <SectionErrorBoundary label="Budgets">
                                <BudgetsSection categories={expenseCategories} />
                            </SectionErrorBoundary>
                        </TabsContent>
                        <TabsContent value="recurring" className="mt-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200">
                            <SectionErrorBoundary label="Recurring">
                                <RecurringSection categories={expenseCategories} />
                            </SectionErrorBoundary>
                        </TabsContent>
                    </Tabs>
                </div>
                )}

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

                {/* CSV Import Dialog */}
                <CSVImportDialog
                    open={csvImportOpen}
                    onOpenChange={setCsvImportOpen}
                    onImportComplete={() => {
                        entriesHook.loadEntries();
                        refreshSummary();
                    }}
                />

                {/* AI Budget Coach Chat — full mode only */}
                {mode === "full" && <AIChatDrawer />}

                {/* Achievement / Share card — full mode only */}
                {mode === "full" && <AchievementCard open={shareCardOpen} onClose={() => setShareCardOpen(false)} />}

                {/* Salary Reminder Notifications */}
                <SalaryReminderNotification entries={entriesHook.entries} />

                {/* Onboarding Screen */}
                {user && !currencyLoading && onboardingCompleted === false && (
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
        </PullToRefresh>
    );
}

export default function DashboardPage() {
    return <DashboardInnerContent />;
}
