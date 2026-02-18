"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SavingsAccountList } from "@/components/dashboard/SavingsAccountList";
import { SavingsAccountDialog } from "@/components/dashboard/SavingsAccountDialog";
import { formatCurrency } from "@/lib/currency-utils";
import { calculateTotalSavings } from "@/lib/firestore-savings";
import { useSavingsContext } from "@/contexts/dashboard/SavingsContext";

interface SavingsSectionProps {
    userCurrency: string;
}

export function SavingsSection({ userCurrency }: SavingsSectionProps) {
    const { savingsAccounts, loading, dialogOpen, editingAccount, handleDialogClose, handleSubmit, handleEdit, handleDelete, handleAddMoney, handleWithdrawMoney, openDialog } = useSavingsContext();

    const t = useTranslations("savings");

    const totalSavings = calculateTotalSavings(savingsAccounts);
    const description = savingsAccounts.length > 0 ? t("descriptionWithTotal", { total: formatCurrency(totalSavings, { currency: userCurrency }) }) : t("description");

    return (
        <>
            <div className="py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <Button onClick={openDialog} className="w-full md:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        {t("createAccount")}
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
                    <SavingsAccountList accounts={savingsAccounts} onAdd={openDialog} onEdit={handleEdit} onDelete={handleDelete} onAddMoney={handleAddMoney} onWithdrawMoney={handleWithdrawMoney} defaultCurrency={userCurrency} hideHeader={true} />
                )}
            </div>

            <SavingsAccountDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingAccount={editingAccount} defaultCurrency={userCurrency} />
        </>
    );
}
