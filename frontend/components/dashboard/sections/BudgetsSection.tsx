"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BudgetList } from "@/components/dashboard/BudgetList";
import { BudgetDialog } from "@/components/dashboard/BudgetDialog";
import { useBudgetsContext } from "@/contexts/dashboard/BudgetsContext";
import type { Entry } from "@/lib/hooks/dashboard";

interface BudgetsSectionProps {
    entries: Entry[];
    categories: string[];
    userCurrency: string;
}

export function BudgetsSection({ entries, categories, userCurrency }: BudgetsSectionProps) {
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
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-sm text-muted-foreground">{t("loading")}</p>
                        </div>
                    </div>
                ) : (
                    <BudgetList budgets={budgets} entries={entries} categories={categories} onAdd={openDialog} onEdit={handleEdit} onDelete={handleDelete} onRenew={handleRenew} />
                )}
            </div>

            <BudgetDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingBudget={editingBudget} categories={categories} defaultCurrency={userCurrency} />
        </>
    );
}
