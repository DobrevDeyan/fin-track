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
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

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
  const [successPulse, setSuccessPulse] = useState(false)

  const handleTransaction = async () => {
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      return
    }

    if (transactionType === "withdraw" && amountNum > account.balance) {
      toast.error("Insufficient balance")
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
      setSuccessPulse(true)
      setTimeout(() => setSuccessPulse(false), 700)
    } catch (error) {
      console.error("Error processing transaction:", error)
      toast.error("Failed to process transaction")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <motion.div
        animate={successPulse ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18, duration: 0.5 }}
      >
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
                aria-label={`Edit ${account.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(account.id)}
                className="h-8 w-8 text-destructive"
                aria-label={`Delete ${account.name}`}
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
                size="sm"
                className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-sm"
                onClick={() => {
                  setTransactionType("add")
                  setTransactionDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium"
                onClick={() => {
                  setTransactionType("withdraw")
                  setTransactionDialogOpen(true)
                }}
                disabled={account.balance === 0}
              >
                <Minus className="h-4 w-4 mr-1.5" />
                Withdraw
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {transactionType === "add" ? (
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-500" /> Add to {account.name}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-red-500" /> Withdraw from {account.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Balance: <span className="font-medium text-foreground">{formatCurrency(account.balance, { currency: account.currency })}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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
                onKeyDown={(e) => e.key === "Enter" && handleTransaction()}
                autoFocus
                className="text-lg h-11"
              />
            </div>
            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {(transactionType === "add" ? [10, 50, 100, 500] : [
                ...(account.balance >= 100 ? [Math.round(account.balance * 0.25)] : []),
                ...(account.balance >= 50 ? [Math.round(account.balance * 0.5)] : []),
                Math.round(account.balance),
              ].filter((v, i, a) => v > 0 && a.indexOf(v) === i)).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-border hover:bg-accent transition-colors"
                >
                  {formatCurrency(preset, { currency: account.currency })}
                </button>
              ))}
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
            <Button
              onClick={handleTransaction}
              disabled={isSubmitting}
              className={transactionType === "add"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"}
            >
              {isSubmitting ? "Processing…" : transactionType === "add" ? "Add" : "Withdraw"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

