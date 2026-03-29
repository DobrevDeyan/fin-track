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
import { SUPPORTED_CURRENCIES, CURRENCY_DISPLAY_NAMES } from "@/lib/constants/currency.constants"
import { AMOUNT_RULES } from "@/lib/constants/validation.constants"

const currencies = SUPPORTED_CURRENCIES

interface SavingsAccountData {
  name: string
  balance: number
  currency: string
  description?: string
  color?: string
  icon?: string
  isActive: boolean
}

interface SavingsAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SavingsAccountData) => Promise<void>
  editingAccount?: {
    id: string
    name: string
    balance: number
    currency: string
    description?: string
    color?: string
    icon?: string
    isActive: boolean
  } | null
  defaultCurrency?: string
}

const SAVINGS_ICONS = [
  { value: "piggy-bank", label: "Piggy Bank" },
  { value: "wallet", label: "Wallet" },
  { value: "briefcase", label: "Briefcase" },
  { value: "home", label: "Home" },
  { value: "car", label: "Car" },
  { value: "plane", label: "Vacation" },
  { value: "heart", label: "Health" },
  { value: "graduation-cap", label: "Education" },
  { value: "gift", label: "Gift" },
  { value: "target", label: "Goal" },
]

const SAVINGS_COLORS = [
  { value: "#000000", label: "Black" },
  { value: "#1F2937", label: "Gray" },
  { value: "#374151", label: "Dark Gray" },
  { value: "#4B5563", label: "Medium Gray" },
  { value: "#6B7280", label: "Light Gray" },
]

export function SavingsAccountDialog({
  open,
  onOpenChange,
  onSubmit,
  editingAccount,
  defaultCurrency = "EUR",
}: SavingsAccountDialogProps) {
  const [name, setName] = useState("")
  const [balance, setBalance] = useState("")
  const [currency, setCurrency] = useState(defaultCurrency)
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#000000")
  const [icon, setIcon] = useState("piggy-bank")
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name)
      setBalance(editingAccount.balance.toString())
      setCurrency(editingAccount.currency)
      setDescription(editingAccount.description || "")
      setColor(editingAccount.color || "#000000")
      setIcon(editingAccount.icon || "piggy-bank")
      setIsActive(editingAccount.isActive)
    } else {
      // Reset form for new account
      setName("")
      setBalance("0")
      setCurrency(defaultCurrency)
      setDescription("")
      setColor("#000000")
      setIcon("piggy-bank")
      setIsActive(true)
    }
  }, [editingAccount, defaultCurrency, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      return
    }

    const balanceNum = parseFloat(balance) || 0
    if (balanceNum < 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        balance: balanceNum,
        currency,
        description: description.trim() || undefined,
        color,
        icon,
        isActive,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting savings account:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Edit Savings Account" : "Create Savings Account"}
            </DialogTitle>
            <DialogDescription>
              {editingAccount
                ? "Update your savings account details."
                : "Create a new savings account to track money separately from your spending balance."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Emergency Fund, Vacation Fund"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="balance">Initial Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  max={AMOUNT_RULES.MAX}
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        {curr} - {CURRENCY_DISPLAY_NAMES[curr]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a note about this savings account..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="icon">Icon</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger id="icon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SAVINGS_ICONS.map((ic) => (
                      <SelectItem key={ic.value} value={ic.value}>
                        {ic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger id="color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SAVINGS_COLORS.map((col) => (
                      <SelectItem key={col.value} value={col.value}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {editingAccount ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

