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
  Home,
  Gamepad2,
  CreditCard,
  Plus,
  X,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { QUICK_EXPENSE_CATEGORIES } from "@/lib/categories"
import { formatDateForInput } from "@/lib/date-utils"

interface QuickExpenseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    description: string
    amount: number
    category: string
    type: "expense"
    date: string
  }) => Promise<void>
}

// Map icons to categories
const categoryIcons: Record<string, any> = {
  "Food & Dining": UtensilsCrossed,
  "Shopping": ShoppingCart,
  "Transportation": Car,
  "Bills & Utilities": Zap,
  "Entertainment": Gamepad2,
  "Other": CreditCard,
}

const quickCategories = QUICK_EXPENSE_CATEGORIES.map((cat) => ({
  ...cat,
  icon: categoryIcons[cat.id] || CreditCard,
}))

export function QuickExpenseSheet({
  open,
  onOpenChange,
  onSubmit,
}: QuickExpenseSheetProps) {
  const [amount, setAmount] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-generate description from category
  useEffect(() => {
    if (selectedCategory && !description) {
      const category = quickCategories.find((c) => c.id === selectedCategory)
      if (category) {
        setDescription(category.label)
      }
    }
  }, [selectedCategory, description])

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      setAmount("")
      setSelectedCategory(null)
      setDescription("")
      setIsSubmitting(false)
    }
  }, [open])

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
        description: description || quickCategories.find((c) => c.id === selectedCategory)?.label || "Expense",
        amount: parseFloat(amount),
        category: selectedCategory,
        type: "expense",
        date: formatDateForInput(new Date()),
      })
      // Close sheet on success
      onOpenChange(false)
    } catch (error) {
      // Error is handled by parent component
      console.error("Error submitting expense:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = selectedCategory && amount && parseFloat(amount) > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="!h-[90vh] max-h-[90vh] rounded-t-3xl flex flex-col p-0 overflow-hidden"
        style={{ height: '90vh', maxHeight: '90vh' }}
      >
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl sm:text-2xl font-bold">Quick Expense</SheetTitle>
            <SheetDescription className="text-sm">
              Tap category, enter amount, and save
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-3 min-h-0">
          <div className="flex flex-col gap-3">
            {/* Category Selection */}
            <div className="space-y-1.5">
              <Label className="text-sm sm:text-base font-semibold">Category</Label>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {quickCategories.map((category) => {
                  const Icon = category.icon
                  const isSelected = selectedCategory === category.id
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-1 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border-2 transition-all",
                        "active:scale-95",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div
                        className={cn(
                          "p-1.5 sm:p-2 rounded-full text-white",
                          category.color,
                          isSelected && "ring-2 ring-primary ring-offset-1"
                        )}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <span className="text-xs font-medium">{category.label}</span>
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
              <Label className="text-sm sm:text-base font-semibold">Amount</Label>
              <div className="relative">
                <div className="text-3xl sm:text-4xl font-bold text-center py-3 sm:py-4 px-4 bg-muted rounded-xl min-h-[70px] sm:min-h-[80px] flex items-center justify-center">
                  <span className="text-muted-foreground mr-2">€</span>
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
                <Label className="text-sm sm:text-base font-semibold">Description (Optional)</Label>
                <Input
                  placeholder="e.g., Grocery store, Gas station..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            )}

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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
                    "h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-lg border-2 flex items-center justify-center",
                    "active:scale-95 transition-all",
                    key === "backspace"
                      ? "border-destructive/50 hover:bg-destructive/10 hover:border-destructive"
                      : "border-border hover:bg-muted hover:border-primary/50"
                  )}
                >
                  {key === "backspace" ? (
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button - Fixed at bottom */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 border-t flex-shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            size="lg"
            className={cn(
              "w-full h-11 sm:h-12 text-sm sm:text-base font-bold",
              !canSubmit && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              "Saving..."
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Expense
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

