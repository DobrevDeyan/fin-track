"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Plus, Minus } from "lucide-react"
import { formatCurrency } from "@/lib/currency-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"

type SavingsAccount = import("@/lib/firestore-types").SavingsAccountDocument & { id: string }

interface SavingsAccountCardProps {
  account: SavingsAccount
  onEdit: (account: SavingsAccount) => void
  onDelete: (accountId: string) => void
  onAddMoney: (accountId: string, amount: number) => Promise<void>
  onWithdrawMoney: (accountId: string, amount: number) => Promise<void>
}

const getIconEmoji = (icon?: string) => {
  const iconMap: Record<string, string> = {
    "piggy-bank": "🐷",
    wallet: "💼",
    briefcase: "💼",
    home: "🏠",
    car: "🚗",
    plane: "✈️",
    heart: "❤️",
    "graduation-cap": "🎓",
    gift: "🎁",
    target: "🎯",
  }
  return iconMap[icon || "piggy-bank"] || "💰"
}

export function SavingsAccountCard({
  account,
  onEdit,
  onDelete,
  onAddMoney,
  onWithdrawMoney,
}: SavingsAccountCardProps) {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<"add" | "withdraw">("add")
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleTransaction = async () => {
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      return
    }

    if (transactionType === "withdraw" && amountNum > account.balance) {
      alert("Insufficient balance")
      return
    }

    setIsSubmitting(true)
    try {
      if (transactionType === "add") {
        await onAddMoney(account.id, amountNum)
      } else {
        await onWithdrawMoney(account.id, amountNum)
      }
      setAmount("")
      setTransactionDialogOpen(false)
    } catch (error) {
      console.error("Error processing transaction:", error)
      alert("Failed to process transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{
                  backgroundColor: account.color || "#000000",
                  color: "#FFFFFF",
                }}
              >
                {getIconEmoji(account.icon)}
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{account.name}</CardTitle>
                {account.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {account.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(account)}
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(account.id)}
                className="h-8 w-8 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Balance</p>
              <p className="text-2xl font-bold">
                {formatCurrency(account.balance, { currency: account.currency })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setTransactionType("add")
                  setTransactionDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setTransactionType("withdraw")
                  setTransactionDialogOpen(true)
                }}
                disabled={account.balance === 0}
              >
                <Minus className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionType === "add" ? "Add Money" : "Withdraw Money"}
            </DialogTitle>
            <DialogDescription>
              {transactionType === "add"
                ? `Add money to ${account.name}`
                : `Withdraw money from ${account.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount ({account.currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
              {transactionType === "withdraw" && account.balance > 0 && (
                <p className="text-xs text-muted-foreground">
                  Available: {formatCurrency(account.balance, { currency: account.currency })}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTransactionDialogOpen(false)
                setAmount("")
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleTransaction} disabled={isSubmitting}>
              {transactionType === "add" ? "Add" : "Withdraw"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

