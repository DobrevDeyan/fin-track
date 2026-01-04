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
import { Textarea } from "@/components/ui/textarea"
import { GoalDocument } from "@/lib/firestore-types"
import { SUPPORTED_CURRENCIES } from "@/lib/constants/currency.constants"

interface GoalData {
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline?: string
  category?: string
  description?: string
  isActive: boolean
}

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: GoalData) => Promise<void>
  editingGoal?: (GoalDocument & { id: string }) | null
  categories: string[]
  defaultCurrency?: string
}

const currencies = SUPPORTED_CURRENCIES

export function GoalDialog({
  open,
  onOpenChange,
  onSubmit,
  editingGoal,
  categories,
  defaultCurrency = "EUR",
}: GoalDialogProps) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [currency, setCurrency] = useState(defaultCurrency)
  const [deadline, setDeadline] = useState("")
  const [category, setCategory] = useState<string>("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)

  // Populate form when editing
  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name)
      setTargetAmount(editingGoal.targetAmount.toString())
      setCurrentAmount(editingGoal.currentAmount.toString())
      setCurrency(editingGoal.currency)
      if (editingGoal.deadline) {
        const date = editingGoal.deadline.toDate()
        setDeadline(date.toISOString().split("T")[0])
      } else {
        setDeadline("")
      }
      setCategory(editingGoal.category || "")
      setDescription(editingGoal.description || "")
      setIsActive(editingGoal.isActive)
    } else {
      // Reset form for new goal
      setName("")
      setTargetAmount("")
      setCurrentAmount("0")
      setCurrency(defaultCurrency)
      setDeadline("")
      setCategory("")
      setDescription("")
      setIsActive(true)
    }
  }, [editingGoal, open, defaultCurrency])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !targetAmount) return

    try {
      await onSubmit({
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        currency,
        deadline: deadline || undefined,
        category: category || undefined,
        description: description || undefined,
        isActive,
      })

      // Reset form
      setName("")
      setTargetAmount("")
      setCurrentAmount("0")
      setCurrency(defaultCurrency)
      setDeadline("")
      setCategory("")
      setDescription("")
      setIsActive(true)
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting goal:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingGoal ? "Edit Goal" : "Create Financial Goal"}</DialogTitle>
          <DialogDescription>
            {editingGoal
              ? "Update your financial goal details."
              : "Set a savings goal and track your progress toward it."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Goal Name</Label>
              <Input
                id="name"
                placeholder="e.g., Emergency Fund, Vacation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add more details about your goal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="targetAmount">Target Amount</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        {curr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currentAmount">Current Amount</Label>
              <Input
                id="currentAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                How much have you saved so far?
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Select value={category || "none"} onValueChange={(value) => setCategory(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline (Optional)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                When do you want to reach this goal?
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
                Active Goal
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingGoal ? "Update Goal" : "Create Goal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

