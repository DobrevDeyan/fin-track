"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GoalList } from "@/components/dashboard/GoalList";
import { GoalDialog } from "@/components/dashboard/GoalDialog";
import { useGoalsContext } from "@/contexts/dashboard/GoalsContext";

interface GoalsSectionProps {
    categories: string[];
    userCurrency: string;
}

export function GoalsSection({ categories, userCurrency }: GoalsSectionProps) {
    const { goals, loading, dialogOpen, editingGoal, handleDialogClose, handleSubmit, handleEdit, handleDelete, openDialog } = useGoalsContext();

    const t = useTranslations("goals");

    return (
        <>
            <div className="py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <p className="text-sm text-muted-foreground">{t("description")}</p>
                    <Button onClick={openDialog} className="w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("createGoal")}
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
                    <GoalList goals={goals} onAdd={openDialog} onEdit={handleEdit} onDelete={handleDelete} />
                )}
            </div>

            <GoalDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingGoal={editingGoal} categories={categories} defaultCurrency={userCurrency} />
        </>
    );
}
