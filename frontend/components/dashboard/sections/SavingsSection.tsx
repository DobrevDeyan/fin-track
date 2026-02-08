"use client"

/**
 * Savings Section Component
 *
 * Displays savings accounts with full CRUD functionality.
 * Uses SavingsContext to get state and actions - no prop drilling needed.
 */

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { SavingsAccountList } from "@/components/dashboard/SavingsAccountList"
import { SavingsAccountDialog } from "@/components/dashboard/SavingsAccountDialog"
import { formatCurrency } from "@/lib/currency-utils"
import { calculateTotalSavings } from "@/lib/firestore-savings"
import { useSavingsContext } from "@/contexts/dashboard"

interface SavingsSectionProps {
  userCurrency: string
}

export function SavingsSection({ userCurrency }: SavingsSectionProps) {
  const {
    savingsAccounts,
    loading,
    dialogOpen,
    editingAccount,
    handleDialogClose,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleAddMoney,
    handleWithdrawMoney,
    openDialog,
  } = useSavingsContext()

  const totalSavings = calculateTotalSavings(savingsAccounts)
  const description = `Track your savings separately from your spending balance${
    savingsAccounts.length > 0
      ? ` • Total: ${formatCurrency(totalSavings, { currency: userCurrency })}`
      : ""
  }`

  return (
    <>
      <CollapsibleSection
        title="Savings Accounts"
        description={description}
        actionButton={
          <Button onClick={openDialog} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Savings Account
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading savings accounts...
              </p>
            </div>
          </div>
        ) : (
          <SavingsAccountList
            accounts={savingsAccounts}
            onAdd={openDialog}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddMoney={handleAddMoney}
            onWithdrawMoney={handleWithdrawMoney}
            defaultCurrency={userCurrency}
            hideHeader={true}
          />
        )}
      </CollapsibleSection>

      <SavingsAccountDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        editingAccount={editingAccount}
        defaultCurrency={userCurrency}
      />
    </>
  )
}
