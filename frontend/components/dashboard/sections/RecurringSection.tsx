"use client"

/**
 * Recurring Transactions Section Component
 *
 * Displays recurring transactions with full CRUD functionality.
 * Uses RecurringContext to get state and actions - minimal props needed.
 */

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { RecurringTransactionList } from "@/components/dashboard/RecurringTransactionList"
import { RecurringTransactionDialog } from "@/components/dashboard/RecurringTransactionDialog"
import { useRecurringContext } from "@/contexts/dashboard"

interface RecurringSectionProps {
  categories: string[]
}

export function RecurringSection({ categories }: RecurringSectionProps) {
  const {
    recurringTransactions,
    loading,
    dialogOpen,
    editingRecurring,
    handleDialogClose,
    handleSubmit,
    handleEdit,
    handleDelete,
    openDialog,
  } = useRecurringContext()

  return (
    <>
      <CollapsibleSection
        title="Recurring Transactions"
        description="Manage your recurring bills, subscriptions, and income"
        actionButton={
          <Button onClick={openDialog} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Recurring Transaction
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading recurring transactions...
              </p>
            </div>
          </div>
        ) : (
          <RecurringTransactionList
            recurringTransactions={recurringTransactions}
            onAdd={openDialog}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </CollapsibleSection>

      <RecurringTransactionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        editingRecurring={editingRecurring}
        categories={categories}
      />
    </>
  )
}
