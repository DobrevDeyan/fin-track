"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RecurringEntryDocument } from "@/lib/firestore-types"
import { calculateNextDate } from "@/lib/firestore-recurring"

interface RecurringTransactionData {
  name: string
  amount: number
  type: "income" | "expense"
  category: string
  frequency: "weekly" | "monthly" | "yearly"
  nextDate: string
  isActive: boolean
}

interface RecurringTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: RecurringTransactionData) => Promise<void>
  editingRecurring?: (RecurringEntryDocument & { id: string }) | null
  categories: string[]
}

export function RecurringTransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  editingRecurring,
  categories,
}: RecurringTransactionDialogProps) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"income" | "expense">("expense")
  const [category, setCategory] = useState("")
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly")
  const [nextDate, setNextDate] = useState("")
  const [isActive, setIsActive] = useState(true)

  // Populate form when editing
  useEffect(() => {
    if (editingRecurring) {
      setName(editingRecurring.name)
      setAmount(editingRecurring.amount.toString())
      setType(editingRecurring.type)
      setCategory(editingRecurring.category)
      setFrequency(editingRecurring.frequency)
      // Convert Timestamp to date string
      const date = editingRecurring.nextDate.toDate()
      setNextDate(date.toISOString().split("T")[0])
      setIsActive(editingRecurring.isActive)
    } else {
      // Reset form for new recurring transaction
      setName("")
      setAmount("")
      setType("expense")
      setCategory("")
      setFrequency("monthly")
      // Set default next date to today
      const today = new Date()
      setNextDate(today.toISOString().split("T")[0])
      setIsActive(true)
    }
  }, [editingRecurring, open])

  // Auto-update next date when frequency changes (for new transactions)
  useEffect(() => {
    if (!editingRecurring && nextDate && frequency) {
      const currentDate = new Date(nextDate)
      const calculatedNext = calculateNextDate(currentDate, frequency)
      setNextDate(calculatedNext.toISOString().split("T")[0])
    }
  }, [frequency, editingRecurring])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !amount || !category) return

    try {
      await onSubmit({
        name,
        amount: parseFloat(amount),
        type,
        category,
        frequency,
        nextDate,
        isActive,
      })

      // Reset form
      setName("")
      setAmount("")
      setType("expense")
      setCategory("")
      setFrequency("monthly")
      const today = new Date()
      setNextDate(today.toISOString().split("T")[0])
      setIsActive(true)
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting recurring transaction:", error)
    }
  }

  // Filter categories based on type
  const filteredCategories = categories.filter((cat) => {
    // This is a simple filter - you might want to enhance this
    // For now, we'll show all categories
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRecurring ? "Edit Recurring Transaction" : "Create Recurring Transaction"}
          </DialogTitle>
          <DialogDescription>
            {editingRecurring
              ? "Update your recurring transaction details."
              : "Set up a recurring bill or subscription that will automatically create transactions."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Transaction Name</Label>
              <Input
                id="name"
                placeholder="e.g., Netflix Subscription"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value: "income" | "expense") => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(value: "weekly" | "monthly" | "yearly") => setFrequency(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nextDate">Next Occurrence Date</Label>
              <Input
                id="nextDate"
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                When should the next transaction be created?
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active (will create transactions automatically)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingRecurring ? "Update Recurring Transaction" : "Create Recurring Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

