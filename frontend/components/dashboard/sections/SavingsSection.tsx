"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus, PiggyBank } from "lucide-react";
import { SavingsAccountList } from "@/components/dashboard/SavingsAccountList";
import { SavingsAccountDialog } from "@/components/dashboard/SavingsAccountDialog";
import { calculateTotalSavings } from "@/lib/firestore-savings";
import { useSavingsContext } from "@/contexts/dashboard/SavingsContext";
import { useMoney } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";

export function SavingsSection() {
    const { format } = useMoney();
    const { savingsAccounts, loading, dialogOpen, editingAccount, handleDialogClose, handleSubmit, handleEdit, handleDelete, handleAddMoney, handleWithdrawMoney, openDialog } = useSavingsContext();

    const t = useTranslations("savings");

    const totalSavings = calculateTotalSavings(savingsAccounts);
    const description = savingsAccounts.length > 0 ? t("descriptionWithTotal", { total: format(totalSavings) }) : t("description");

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
                    ) : savingsAccounts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-muted p-4 mb-4">
                                <PiggyBank className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-sm mb-1">{t("emptyTitle")}</p>
                            <p className="text-xs text-muted-foreground mb-4 max-w-xs">{t("emptyDescription")}</p>
                            <Button size="sm" onClick={openDialog}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("createAccount")}
                            </Button>
                        </div>
                    ) : (
                        <SavingsAccountList accounts={savingsAccounts} onEdit={handleEdit} onDelete={handleDelete} onAddMoney={handleAddMoney} onWithdrawMoney={handleWithdrawMoney} />
                    )}
                </div>
            </div>

            <SavingsAccountDialog open={dialogOpen} onOpenChange={handleDialogClose} onSubmit={handleSubmit} editingAccount={editingAccount} />
        </>
    );
}
