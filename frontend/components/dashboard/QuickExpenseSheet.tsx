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

interface QuickExpenseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    description: string
    amount: number
    category: string
    type: "expense"
    date: string
  }) => void
}

const quickCategories = [
  { id: "Food & Dining", label: "Food", icon: UtensilsCrossed, color: "bg-red-500" },
  { id: "Shopping", label: "Shopping", icon: ShoppingCart, color: "bg-blue-500" },
  { id: "Transportation", label: "Fuel", icon: Car, color: "bg-green-500" },
  { id: "Bills & Utilities", label: "Bills", icon: Zap, color: "bg-yellow-500" },
  { id: "Entertainment", label: "Fun", icon: Gamepad2, color: "bg-purple-500" },
  { id: "Other", label: "Other", icon: CreditCard, color: "bg-gray-500" },
]

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
    onSubmit({
      description: description || quickCategories.find((c) => c.id === selectedCategory)?.label || "Expense",
      amount: parseFloat(amount),
      category: selectedCategory,
      type: "expense",
      date: new Date().toISOString(),
    })

    // Small delay for better UX
    setTimeout(() => {
      setIsSubmitting(false)
      onOpenChange(false)
    }, 300)
  }

  const canSubmit = selectedCategory && amount && parseFloat(amount) > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] max-h-[700px] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-2xl font-bold">Quick Expense</SheetTitle>
          <SheetDescription>
            Tap category, enter amount, and save
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full gap-6 pb-6">
          {/* Category Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Category</Label>
            <div className="grid grid-cols-3 gap-3">
              {quickCategories.map((category) => {
                const Icon = category.icon
                const isSelected = selectedCategory === category.id
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                      "active:scale-95",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div
                      className={cn(
                        "p-3 rounded-full text-white",
                        category.color,
                        isSelected && "ring-2 ring-primary ring-offset-2"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">{category.label}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount Display */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Amount</Label>
            <div className="relative">
              <div className="text-5xl font-bold text-center py-6 px-4 bg-muted rounded-xl min-h-[100px] flex items-center justify-center">
                <span className="text-muted-foreground mr-2">€</span>
                <span className={cn(
                  amount ? "text-foreground" : "text-muted-foreground/50"
                )}>
                  {amount || "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3 flex-1">
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
                  "aspect-square text-2xl font-semibold rounded-xl border-2",
                  "active:scale-95 transition-all",
                  key === "backspace"
                    ? "border-destructive/50 hover:bg-destructive/10 hover:border-destructive"
                    : "border-border hover:bg-muted hover:border-primary/50"
                )}
              >
                {key === "backspace" ? (
                  <X className="h-6 w-6 mx-auto" />
                ) : (
                  key
                )}
              </button>
            ))}
          </div>

          {/* Description (Optional) */}
          {selectedCategory && (
            <div className="space-y-2">
              <Label className="text-base font-semibold">Description (Optional)</Label>
              <Input
                placeholder="e.g., Grocery store, Gas station..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-base h-12"
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            size="lg"
            className={cn(
              "w-full h-14 text-lg font-bold",
              !canSubmit && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              "Saving..."
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Save Expense
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

