"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Plus, Minus } from "lucide-react"
import { useMoney } from "@/contexts/CurrencyContext"
import { BASE_CURRENCY } from "@/lib/constants/currency.constants"
import { AMOUNT_RULES } from "@/lib/constants/validation.constants"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { logger } from "@/lib/utils/logger"


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

// Floor a display amount to whole cents so a preset can never round UP past the
// real balance (which would trip the insufficient-balance guard) — review S-6.
const floorCents = (n: number) => Math.floor(n * 100) / 100

export function SavingsAccountCard({
  account,
  onEdit,
  onDelete,
  onAddMoney,
  onWithdrawMoney,
}: SavingsAccountCardProps) {
  const t = useTranslations("savings")
  const tc = useTranslations("common")
  const { format, toBase, fromBase, currency, ratesReady } = useMoney()
  const displayBalance = fromBase(account.balance)
  const fmtAmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n)
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<"add" | "withdraw">("add")
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successPulse, setSuccessPulse] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  // Treat sub-cent balances as empty so float drift can't leave the Withdraw
  // button enabled on an effectively un-withdrawable amount (review S-7).
  const isEmpty = account.balance < 0.005

  const handleTransaction = async () => {
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      return
    }

    // A non-EUR amount must be converted to base before persisting; block until
    // live fixings have loaded so we never store an unconverted value (S-16).
    if (currency !== BASE_CURRENCY && !ratesReady) {
      toast.error(t("ratesNotReady"))
      return
    }

    if (transactionType === "withdraw" && toBase(amountNum) > account.balance + 0.005) {
      toast.error(t("insufficientBalance"))
      return
    }

    setIsSubmitting(true)
    try {
      if (transactionType === "add") {
        await onAddMoney(account.id, toBase(amountNum))
      } else {
        await onWithdrawMoney(account.id, toBase(amountNum))
      }
      setAmount("")
      setTransactionDialogOpen(false)
      setSuccessPulse(true)
      setTimeout(() => setSuccessPulse(false), 700)
    } catch (error) {
      logger.error("Error processing transaction", error)
      toast.error(t("processFailed"))
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
                aria-label={t("editAria", { name: account.name })}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmDeleteOpen(true)}
                className="h-8 w-8 text-destructive"
                aria-label={t("deleteAria", { name: account.name })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("accountBalance")}</p>
              <p className="text-2xl font-bold">
                {format(account.balance)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 font-medium"
                onClick={() => {
                  setTransactionType("add")
                  setTransactionDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {tc("add")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-10 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:border-red-800 font-medium"
                onClick={() => {
                  setTransactionType("withdraw")
                  setTransactionDialogOpen(true)
                }}
                disabled={isEmpty}
              >
                <Minus className="h-4 w-4 mr-1.5" />
                {t("withdraw")}
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
                  <Plus className="h-4 w-4 text-emerald-500" /> {t("addTo", { name: account.name })}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-red-500" /> {t("withdrawFrom", { name: account.name })}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("accountBalance")}: <span className="font-medium text-foreground">{format(account.balance)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="amount">{tc("amount")} ({currency})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={AMOUNT_RULES.MAX}
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
                ...(displayBalance >= 100 ? [floorCents(displayBalance * 0.25)] : []),
                ...(displayBalance >= 50 ? [floorCents(displayBalance * 0.5)] : []),
                floorCents(displayBalance),
              ].filter((v, i, a) => v > 0 && a.indexOf(v) === i)).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-border hover:bg-accent transition-colors"
                >
                  {fmtAmt(preset)}
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
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleTransaction}
              disabled={isSubmitting}
              className={transactionType === "add"
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-red-500 hover:bg-red-600 text-white"}
            >
              {isSubmitting ? t("processing") : transactionType === "add" ? tc("add") : t("withdraw")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDesc", { name: account.name })}
              {!isEmpty && (
                <span className="mt-2 block font-medium text-destructive">
                  {t("deleteConfirmBalanceWarning", { balance: format(account.balance) })}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(account.id)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
