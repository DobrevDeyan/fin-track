"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RecurringTransactionList } from "@/components/dashboard/RecurringTransactionList";
import { RecurringTransactionDialog } from "@/components/dashboard/RecurringTransactionDialog";
import { useRecurringContext } from "@/contexts/dashboard/RecurringContext";

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
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="mt-2 text-sm text-muted-foreground">{t("loading")}</p>
                        </div>
                    </div>
                ) : (
                    <RecurringTransactionList recurringTransactions={recurringTransactions} onAdd={openDialog} onEdit={handleEdit} onDelete={handleDelete} />
                )}
            </div>

            <RecurringTransactionDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingRecurring={editingRecurring} categories={categories} />
        </>
    );
}
