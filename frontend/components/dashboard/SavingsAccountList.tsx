"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SavingsAccountCard } from "./SavingsAccountCard"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/currency-utils"

type SavingsAccount = import("@/lib/firestore-types").SavingsAccountDocument & { id: string }

interface SavingsAccountListProps {
  accounts: SavingsAccount[]
  onAdd: () => void
  onEdit: (account: SavingsAccount) => void
  onDelete: (accountId: string) => void
  onAddMoney: (accountId: string, amount: number) => Promise<void>
  onWithdrawMoney: (accountId: string, amount: number) => Promise<void>
  defaultCurrency?: string
}

export function SavingsAccountList({
  accounts,
  onAdd,
  onEdit,
  onDelete,
  onAddMoney,
  onWithdrawMoney,
  defaultCurrency = "EUR",
}: SavingsAccountListProps) {
  const activeAccounts = accounts.filter((acc) => acc.isActive)
  const totalSavings = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0)

  if (activeAccounts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Savings Accounts</h2>
            <p className="text-muted-foreground mt-1">
              Track your savings separately from your spending balance
            </p>
          </div>
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Create Savings Account
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center mb-4">
              No savings accounts yet. Create one to start tracking your savings separately.
            </p>
            <Button onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Savings Account
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Savings Accounts</h2>
          <p className="text-muted-foreground mt-1">
            Total Savings:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(totalSavings, { currency: defaultCurrency })}
            </span>
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Create Savings Account
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeAccounts.map((account) => (
          <SavingsAccountCard
            key={account.id}
            account={account}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddMoney={onAddMoney}
            onWithdrawMoney={onWithdrawMoney}
          />
        ))}
      </div>
    </div>
  )
}

