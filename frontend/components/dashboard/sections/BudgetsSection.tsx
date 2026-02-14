"use client";

/**
 * Budgets Section Component
 *
 * Displays budgets with full CRUD functionality.
 * Uses BudgetsContext to get state and actions - minimal props needed.
 */

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
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
    const { budgets, loading, dialogOpen, editingBudget, handleDialogClose, handleSubmit, handleEdit, handleDelete, openDialog } = useBudgetsContext();

    const t = useTranslations("budgets");

    return (
        <>
            <CollapsibleSection
                title={t("title")}
                description={t("description")}
                actionButton={
                    <Button onClick={openDialog} className="w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("createBudget")}
                    </Button>
                }
            >
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-sm text-muted-foreground">{t("loading")}</p>
                        </div>
                    </div>
                ) : (
                    <BudgetList budgets={budgets} entries={entries} categories={categories} onAdd={openDialog} onEdit={handleEdit} onDelete={handleDelete} />
                )}
            </CollapsibleSection>

            <BudgetDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingBudget={editingBudget} categories={categories} defaultCurrency={userCurrency} />
        </>
    );
}
