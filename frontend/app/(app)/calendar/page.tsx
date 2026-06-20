"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CalendarView } from "@/components/dashboard/CalendarView";
import { AddTransactionDialog } from "@/components/dashboard/AddTransactionDialog";

import { PullToRefresh } from "@/components/PullToRefresh";
import { useRecurringContext } from "@/contexts/dashboard/RecurringContext";

import { useEntries } from "@/lib/hooks/dashboard";
import type { Entry } from "@/lib/hooks/dashboard";
import { getUserEntriesByDateRange } from "@/lib/firestore-entries";
import { toISOString } from "@/lib/utils/timestamp";

/**
 * Inner content that uses the dashboard contexts
 */
function CalendarInnerContent() {
    const t = useTranslations("calendar");
    const { user } = useAuth();
    const { userCurrency } = useCurrency();
    const { recurringTransactions, loadRecurringTransactions, ensureRecurringLoaded } = useRecurringContext();

    const hasLoadedRef = useRef(false);

    // Pre-filled date for add dialog
    const [prefilledDate, setPrefilledDate] = useState<string>("");
    const [dialogOpen, setDialogOpen] = useState(false);

    // The calendar is a historical month-grid view, so it must show entries far
    // beyond the most-recent page. Load a wide range (last 12 months → next month)
    // via a ranged query rather than the 20-entry useEntries list (see review CAL1).
    const [calendarEntries, setCalendarEntries] = useState<Entry[]>([]);
    const [calLoading, setCalLoading] = useState(true);

    // useEntries is kept only for its add/create handler (which updates the summary).
    const entriesHook = useEntries({
        userId: user?.uid,
        userCurrency
    });

    const loadCalendarEntries = useCallback(async () => {
        if (!user) return;
        setCalLoading(true);
        try {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString().slice(0, 10);
            const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10);
            const docs = await getUserEntriesByDateRange(user.uid, start, end);
            setCalendarEntries(
                docs.map((d) => ({
                    id: d.id,
                    description: d.description,
                    amount: d.amount,
                    category: d.category,
                    date: toISOString(d.date) || "",
                    type: d.type,
                }))
            );
        } catch {
            setCalendarEntries([]);
        } finally {
            setCalLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            loadCalendarEntries();
            ensureRecurringLoaded();
        }
    }, [user, loadCalendarEntries, ensureRecurringLoaded]);

    const handleAddTransaction = useCallback((dateStr: string) => {
        setPrefilledDate(dateStr);
        setDialogOpen(true);
    }, []);

    const handleDialogClose = useCallback((open: boolean) => {
        setDialogOpen(open);
        if (!open) {
            setPrefilledDate("");
        }
    }, []);

    return (
        <PullToRefresh onRefresh={async () => { await loadCalendarEntries(); await loadRecurringTransactions(); }}>
        <div className="min-h-screen bg-background overflow-x-hidden">
            <div className="container py-8 px-4 sm:px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground">{t("title")}</h1>
                        <p className="text-muted-foreground mt-2">{t("description")}</p>
                    </div>
                </div>

                {/* Loading state */}
                {calLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-sm text-muted-foreground">{t("loading")}</p>
                        </div>
                    </div>
                ) : (
                    <CalendarView entries={calendarEntries} recurringTransactions={recurringTransactions} userCurrency={userCurrency} onAddTransaction={handleAddTransaction} />
                )}

                {/* Add Transaction Dialog */}
                <AddTransactionDialog
                    open={dialogOpen}
                    onOpenChange={handleDialogClose}
                    onSubmit={async (data) => {
                        await entriesHook.handleAdd(data);
                        await loadCalendarEntries();
                        setDialogOpen(false);
                    }}
                    editingEntry={null}
                    savingsAccounts={[]}
                    defaultDate={prefilledDate}
                />
            </div>
        </div>
        </PullToRefresh>
    );
}

export default function CalendarPage() {
    return <CalendarInnerContent />;
}
