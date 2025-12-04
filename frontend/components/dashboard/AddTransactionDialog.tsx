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
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea"
import { TRANSACTION_CATEGORIES } from "@/lib/categories"
import { formatDateForInput } from "@/lib/date-utils"

interface TransactionData {
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  date: string
  notes?: string
}

interface AddTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TransactionData) => Promise<void>
  editingEntry?: {
    id: string
    description: string
    amount: number
    category: string
    type: "income" | "expense"
    date: string
    notes?: string
  } | null
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  editingEntry,
}: AddTransactionDialogProps) {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [type, setType] = useState<"income" | "expense">("expense")
  const [date, setDate] = useState(formatDateForInput(new Date()))
  const [notes, setNotes] = useState("")

  // Populate form when editing
  useEffect(() => {
    if (editingEntry) {
      setDescription(editingEntry.description)
      setAmount(editingEntry.amount.toString())
      setCategory(editingEntry.category)
      setType(editingEntry.type)
      setDate(formatDateForInput(editingEntry.date))
      setNotes(editingEntry.notes || "")
    } else {
      // Reset form for new entry
      setDescription("")
      setAmount("")
      setCategory("")
      setType("expense")
      setDate(formatDateForInput(new Date()))
      setNotes("")
    }
  }, [editingEntry, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !category) return

    try {
      await onSubmit({
        description,
        amount: parseFloat(amount),
        category,
        type,
        date,
        notes: notes.trim() || undefined,
      })

      // Reset form
      setDescription("")
      setAmount("")
      setCategory("")
      setType("expense")
      setDate(formatDateForInput(new Date()))
      setNotes("")
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
      console.error("Error submitting entry:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingEntry ? "Edit Entry" : "Add Entry"}</DialogTitle>
          <DialogDescription>
            {editingEntry
              ? "Update your transaction details."
              : "Add a new income or expense entry to track your finances."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value: "income" | "expense") => setType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Grocery shopping"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
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
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingEntry ? "Update Entry" : "Add Entry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

