"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus, Wallet } from "lucide-react";
import { BudgetList } from "@/components/dashboard/BudgetList";
import { BudgetDialog } from "@/components/dashboard/BudgetDialog";
import { useBudgetsContext } from "@/contexts/dashboard/BudgetsContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import type { Entry } from "@/lib/hooks/dashboard";

interface BudgetsSectionProps {
    entries: Entry[];
    categories: string[];
}

export function BudgetsSection({ entries, categories }: BudgetsSectionProps) {
    const { userCurrency } = useCurrency();
    const { budgets, loading, dialogOpen, editingBudget, handleDialogClose, handleSubmit, handleEdit, handleDelete, handleRenew, openDialog } = useBudgetsContext();

    const t = useTranslations("budgets");

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
                        <BudgetList budgets={budgets} entries={entries} categories={categories} onAdd={openDialog} onEdit={handleEdit} onDelete={handleDelete} onRenew={handleRenew} />
                    )}
                </div>
            </div>

            <BudgetDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingBudget={editingBudget} categories={categories} defaultCurrency={userCurrency} />
        </>
    );
}
