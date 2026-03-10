"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GoalList } from "@/components/dashboard/GoalList";
import { GoalDialog } from "@/components/dashboard/GoalDialog";
import { AddFundsDialog } from "@/components/dashboard/AddFundsDialog";
import { useGoalsContext } from "@/contexts/dashboard/GoalsContext";
import { useState } from "react";
import { GoalDocument } from "@/lib/firestore-types";
import { Skeleton } from "@/components/ui/skeleton";

interface GoalsSectionProps {
    categories: string[];
    userCurrency: string;
}

export function GoalsSection({ categories, userCurrency }: GoalsSectionProps) {
    const { goals, loading, dialogOpen, editingGoal, handleDialogClose, handleSubmit, handleEdit, handleDelete, openDialog, handleAddFunds } = useGoalsContext();
    const [addFundsOpen, setAddFundsOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<(GoalDocument & { id: string }) | null>(null);

    const onAddFundsClick = (goal: GoalDocument & { id: string }) => {
        setSelectedGoal(goal);
        setAddFundsOpen(true);
    };

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
                    ) : (
                        <GoalList goals={goals} onAdd={openDialog} onEdit={handleEdit} onDelete={handleDelete} onAddFunds={onAddFundsClick} />
                    )}
                </div>
            </div>

            <GoalDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingGoal={editingGoal} categories={categories} defaultCurrency={userCurrency} />
            <AddFundsDialog open={addFundsOpen} onOpenChange={setAddFundsOpen} goal={selectedGoal} onAddFunds={handleAddFunds} />
        </>
    );
}
