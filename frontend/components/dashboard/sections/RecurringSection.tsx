"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RecurringTransactionList } from "@/components/dashboard/RecurringTransactionList";
import { RecurringTransactionDialog } from "@/components/dashboard/RecurringTransactionDialog";
import { useRecurringContext } from "@/contexts/dashboard/RecurringContext";
import { Skeleton } from "@/components/ui/skeleton";

interface RecurringSectionProps {
    categories: string[];
}

export function RecurringSection({ categories }: RecurringSectionProps) {
    const { recurringTransactions, loading, dialogOpen, editingRecurring, handleDialogClose, handleSubmit, handleEdit, handleDelete, openDialog } = useRecurringContext();

    const t = useTranslations("recurring");

    return (
        <>
            <div className="py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <p className="text-sm text-muted-foreground">{t("description")}</p>
                    <Button onClick={openDialog} className="w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("createRecurring")}
                    </Button>
                </div>
                <div aria-live="polite" aria-busy={loading}>
                    {loading ? (
                        <div role="status" aria-label={t("loading")} className="space-y-2 mt-4">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="flex items-center gap-4 p-3 border rounded-md">
                                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <RecurringTransactionList recurringTransactions={recurringTransactions} onAdd={openDialog} onEdit={handleEdit} onDelete={handleDelete} />
                    )}
                </div>
            </div>

            <RecurringTransactionDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingRecurring={editingRecurring} categories={categories} />
        </>
    );
}
