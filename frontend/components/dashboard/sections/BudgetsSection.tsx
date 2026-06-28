"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";
import { BudgetList } from "@/components/dashboard/BudgetList";
import { BudgetDialog } from "@/components/dashboard/BudgetDialog";
import { useBudgetsContext } from "@/contexts/dashboard/BudgetsContext";
import { useAuth } from "@/contexts/AuthContext";
import { getUserEntriesByDateRange } from "@/lib/firestore-entries";
import { toISOString } from "@/lib/utils/timestamp";
import { Skeleton } from "@/components/ui/skeleton";
import type { Entry } from "@/lib/hooks/dashboard";

interface BudgetsSectionProps {
    categories: string[];
}

export function BudgetsSection({ categories }: BudgetsSectionProps) {
    const { user } = useAuth();
    const { budgets, loading, error, loadBudgets, dialogOpen, editingBudget, handleDialogClose, handleSubmit, handleEdit, handleDelete, handleRenew, openDialog } = useBudgetsContext();

    const t = useTranslations("budgets");

    // Budget "spent" must reflect ALL transactions within each budget's period —
    // not just the most-recently-loaded page of entries. Load entries for the
    // union of every budget's date range in a single ranged query and let
    // BudgetList bucket them per budget. (Previously this used the dashboard's
    // 20-entry list, which silently undercounted spending — see review B1.)
    const [spendEntries, setSpendEntries] = useState<Entry[]>([]);

    useEffect(() => {
        if (!user || budgets.length === 0) {
            setSpendEntries([]);
            return;
        }
        const starts = budgets.map((b) => new Date(b.startDate).getTime()).filter((n) => !Number.isNaN(n));
        const ends = budgets.map((b) => new Date(b.endDate).getTime()).filter((n) => !Number.isNaN(n));
        if (starts.length === 0 || ends.length === 0) return;
        const minStart = new Date(Math.min(...starts)).toISOString().slice(0, 10);
        const maxEnd = new Date(Math.max(...ends)).toISOString().slice(0, 10);

        let cancelled = false;
        getUserEntriesByDateRange(user.uid, minStart, maxEnd)
            .then((docs) => {
                if (cancelled) return;
                setSpendEntries(
                    docs.map((d) => ({
                        id: d.id,
                        description: d.description,
                        amount: d.amount,
                        category: d.category,
                        date: toISOString(d.date) || "",
                        type: d.type,
                    }))
                );
            })
            .catch(() => {
                if (!cancelled) setSpendEntries([]);
            });
        return () => {
            cancelled = true;
        };
    }, [user, budgets]);

    return (
        <>
            <div className="py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <p className="text-sm text-muted-foreground">{t("description")}</p>
                    <Button onClick={openDialog} className="w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("createBudget")}
                    </Button>
                </div>
                <div aria-live="polite" aria-busy={loading}>
                    {loading ? (
                        <div role="status" aria-label={t("loading")} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="rounded-lg border p-4 space-y-3">
                                    <Skeleton className="h-5 w-2/3" />
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-8 w-full mt-2" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <Wallet className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-sm mb-1">{t("loadError")}</p>
                            <Button size="sm" variant="outline" onClick={() => loadBudgets()}>
                                {t("retry")}
                            </Button>
                        </div>
                    ) : budgets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <Wallet className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-sm mb-1">{t("emptyTitle")}</p>
                            <p className="text-xs text-muted-foreground mb-4 max-w-xs">{t("emptyDescription")}</p>
                            <Button size="sm" onClick={openDialog}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("createBudget")}
                            </Button>
                        </div>
                    ) : (
                        <BudgetList budgets={budgets} entries={spendEntries} categories={categories} onAdd={openDialog} onEdit={handleEdit} onDelete={handleDelete} onRenew={handleRenew} />
                    )}
                </div>
            </div>

            <BudgetDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingBudget={editingBudget} categories={categories} />
        </>
    );
}
