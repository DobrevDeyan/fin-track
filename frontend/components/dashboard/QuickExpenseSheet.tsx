"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ShoppingCart,
  Car,
  UtensilsCrossed,
  Zap,
  X,
  Check,
  Smile,
  CircleDot,
  TrendingDown,
  TrendingUp,
  Wallet,
  Briefcase,
  Gift,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { QUICK_EXPENSE_CATEGORIES } from "@/lib/categories"
import { formatDateForInput } from "@/lib/date-utils"
import { DEFAULT_INCOME_CATEGORIES } from "@/lib/firestore-types"

interface QuickExpenseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    description: string
    amount: number
    category: string
    type: "income" | "expense"
    date: string
  }) => Promise<void>
}

// Income categories with icons and colors
const incomeCategories = [
  { id: "Salary", label: "Salary", icon: Briefcase, color: "bg-green-500" },
  { id: "Freelance", label: "Freelance", icon: Wallet, color: "bg-blue-500" },
  { id: "Investment", label: "Investment", icon: BarChart3, color: "bg-purple-500" },
  { id: "Gift", label: "Gift", icon: Gift, color: "bg-pink-500" },
  { id: "Other", label: "Other", icon: CircleDot, color: "bg-gray-500" },
]

// Map icons to expense categories
const expenseCategoryIcons: Record<string, any> = {
  "Food & Dining": UtensilsCrossed,
  "Shopping": ShoppingCart,
  "Transportation": Car,
  "Bills & Utilities": Zap,
  "Entertainment": Smile,
  "Other": CircleDot,
}

const quickExpenseCategories = QUICK_EXPENSE_CATEGORIES.map((cat) => ({
  ...cat,
  icon: expenseCategoryIcons[cat.id] || CircleDot,
}))

export function QuickExpenseSheet({
  open,
  onOpenChange,
  onSubmit,
}: QuickExpenseSheetProps) {
  const [amount, setAmount] = useState("")
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get categories based on transaction type
  const categories = transactionType === "expense" ? quickExpenseCategories : incomeCategories

  // Auto-generate description from category
  useEffect(() => {
    if (selectedCategory && !description) {
      const category = categories.find((c) => c.id === selectedCategory)
      if (category) {
        setDescription(category.label)
      }
    }
  }, [selectedCategory, description, categories])

  // Reset form when sheet closes or transaction type changes
  useEffect(() => {
    if (!open) {
      setAmount("")
      setTransactionType("expense")
      setSelectedCategory(null)
      setDescription("")
      setIsSubmitting(false)
    }
  }, [open])

  // Reset category when transaction type changes
  useEffect(() => {
    setSelectedCategory(null)
    setDescription("")
  }, [transactionType])

  const handleNumberInput = (value: string) => {
    if (value === "." && amount.includes(".")) return
    if (value === "backspace") {
      setAmount((prev) => prev.slice(0, -1))
      return
    }
    if (value === "clear") {
      setAmount("")
      return
    }
    setAmount((prev) => {
      if (prev === "0" && value !== ".") return value
      return prev + value
    })
  }

  const handleSubmit = async () => {
    if (!selectedCategory || !amount || parseFloat(amount) <= 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        description: description || categories.find((c) => c.id === selectedCategory)?.label || (transactionType === "expense" ? "Expense" : "Income"),
        amount: parseFloat(amount),
        category: selectedCategory,
        type: transactionType,
        date: formatDateForInput(new Date()),
      })
      // Close sheet on success
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
      console.error("Error submitting transaction:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = selectedCategory && amount && parseFloat(amount) > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="!h-[95dvh] max-h-[95dvh] rounded-t-3xl flex flex-col p-0 overflow-hidden"
        style={{ height: '95dvh', maxHeight: '95dvh' }}
      >
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl font-bold">Quick Transaction</SheetTitle>
            <SheetDescription className="text-xs mt-1">
              Select type, category, enter amount, and save
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          <div className="flex flex-col gap-2.5">
            {/* Transaction Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransactionType("expense")}
                  className={cn(
                    "flex items-center justify-center gap-2 h-10 rounded-lg border-2 font-semibold text-sm transition-all",
                    transactionType === "expense"
                      ? "border-red-500 bg-red-500/10 text-red-600"
                      : "border-border hover:border-red-500/50"
                  )}
                >
                  <TrendingDown className="h-4 w-4" />
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType("income")}
                  className={cn(
                    "flex items-center justify-center gap-2 h-10 rounded-lg border-2 font-semibold text-sm transition-all",
                    transactionType === "income"
                      ? "border-green-500 bg-green-500/10 text-green-600"
                      : "border-border hover:border-green-500/50"
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  Income
                </button>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {categories.map((category) => {
                  const Icon = category.icon
                  const isSelected = selectedCategory === category.id
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all",
                        "active:scale-95",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div
                        className={cn(
                          "p-1.5 rounded-full text-white",
                          category.color,
                          isSelected && "ring-2 ring-primary ring-offset-1"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-medium leading-tight text-center">{category.label}</span>
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary absolute top-1 right-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount Display */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount</Label>
              <div className="relative">
                <div className="text-2xl font-bold text-center py-2.5 px-4 bg-muted rounded-lg min-h-[60px] flex items-center justify-center">
                  <span className="text-muted-foreground mr-1.5 text-lg">€</span>
                  <span className={cn(
                    amount ? "text-foreground" : "text-muted-foreground/50"
                  )}>
                    {amount || "0.00"}
                  </span>
                </div>
              </div>
            </div>

            {/* Description (Optional) */}
            {selectedCategory && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description (Optional)</Label>
                <Input
                  placeholder="e.g., Grocery store, Salary..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            )}

            {/* Number Pad - More compact for mobile */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                "1", "2", "3",
                "4", "5", "6",
                "7", "8", "9",
                ".", "0", "backspace",
              ].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleNumberInput(key)}
                  className={cn(
                    "h-11 text-base font-semibold rounded-lg border-2 flex items-center justify-center",
                    "active:scale-95 transition-all",
                    key === "backspace"
                      ? "border-destructive/50 hover:bg-destructive/10 hover:border-destructive"
                      : "border-border hover:bg-muted hover:border-primary/50"
                  )}
                >
                  {key === "backspace" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button - Fixed at bottom */}
        <div className="px-4 pb-4 pt-2 border-t flex-shrink-0 bg-background">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            size="lg"
            className={cn(
              "w-full h-10 text-sm font-bold shadow-md",
              transactionType === "income" 
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-primary hover:bg-primary/90",
              !canSubmit && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              "Saving..."
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save {transactionType === "income" ? "Income" : "Expense"}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

