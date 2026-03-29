"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  Delete,
  Check,
  Smile,
  CircleDot,
  TrendingDown,
  TrendingUp,
  Wallet,
  Briefcase,
  Gift,
  BarChart3,
  ArrowLeft,
  Calculator,
  Heart,
  GraduationCap,
  Plane,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AMOUNT_RULES } from "@/lib/constants/validation.constants"
import { QUICK_EXPENSE_CATEGORIES } from "@/lib/categories"
import { formatDateForInput } from "@/lib/date-utils"
import { DEFAULT_INCOME_CATEGORIES } from "@/lib/firestore-types"
import { getQuickItemsForCategory, type QuickItem } from "@/lib/quick-items"

interface SavingsAccountOption {
  id: string
  name: string
  balance: number
  currency: string
}

interface QuickExpenseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    description: string
    amount: number
    category: string
    type: "income" | "expense"
    date: string
    categoryId?: string
  }) => Promise<void>
  savingsAccounts?: SavingsAccountOption[]
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
  "Taxes & Insurance": Calculator,
  "Entertainment": Smile,
  "Health & Pharmacy": Heart,
  "Education": GraduationCap,
  "Travel & Vacation": Plane,
  "Gifts & Donations": Gift,
  "Other": CircleDot,
}

const quickExpenseCategories = QUICK_EXPENSE_CATEGORIES.map((cat) => ({
  ...cat,
  icon: expenseCategoryIcons[cat.id] || CircleDot,
}))

// Fallback color map shared across quick-flow and manual category grids
const CATEGORY_COLOR_MAP: Record<string, string> = {
  "Food & Dining": "bg-red-500",
  "Shopping": "bg-blue-500",
  "Transportation": "bg-green-500",
  "Bills & Utilities": "bg-yellow-500",
  "Taxes & Insurance": "bg-orange-600",
  "Entertainment": "bg-purple-500",
  "Health & Pharmacy": "bg-pink-500",
  "Education": "bg-indigo-500",
  "Travel & Vacation": "bg-teal-500",
  "Gifts & Donations": "bg-rose-500",
  "Other": "bg-gray-500",
}

type QuickFlowStep = "category" | "item" | "price"

export function QuickExpenseSheet({
  open,
  onOpenChange,
  onSubmit,
  savingsAccounts = [],
}: QuickExpenseSheetProps) {
  const [amount, setAmount] = useState("")
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [descriptionManuallyEdited, setDescriptionManuallyEdited] = useState(false) // Track if user manually edited description
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Quick flow states (expenses only)
  const [useQuickFlow, setUseQuickFlow] = useState(false) // Toggle for quick flow mode
  const [quickFlowStep, setQuickFlowStep] = useState<QuickFlowStep>("category")
  const [selectedItem, setSelectedItem] = useState<QuickItem | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  
  // Swipe gesture states
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [headerTouchStart, setHeaderTouchStart] = useState<{ x: number; y: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Get categories based on transaction type
  const categories = transactionType === "expense" ? quickExpenseCategories : incomeCategories

  // Auto-generate description from category (only if not manually edited)
  useEffect(() => {
    if (selectedCategory && !description && !descriptionManuallyEdited) {
      // Find within default categories, savings, or goals
      const defaultCategory = categories.find((c) => c.id === selectedCategory)
      if (defaultCategory) {
        setDescription(defaultCategory.label)
      } else if (selectedCategory.startsWith("savings_")) {
        const id = selectedCategory.replace("savings_", "")
        const acc = savingsAccounts.find(a => a.id === id)
        if (acc) setDescription(acc.name)
      }
    }
  }, [selectedCategory, description, descriptionManuallyEdited, categories, savingsAccounts])

  // Reset form when sheet closes or transaction type changes
  useEffect(() => {
    if (!open) {
      setAmount("")
      setTransactionType("expense")
      setSelectedCategory(null)
      setDescription("")
      setDescriptionManuallyEdited(false)
      setIsSubmitting(false)
      setUseQuickFlow(false)
      setQuickFlowStep("category")
      setSelectedItem(null)
      setSelectedPrice(null)
    }
  }, [open])

  // Reset category when transaction type changes
  useEffect(() => {
    setSelectedCategory(null)
    setDescription("")
    setDescriptionManuallyEdited(false)
    setUseQuickFlow(false)
    setQuickFlowStep("category")
    setSelectedItem(null)
    setSelectedPrice(null)
  }, [transactionType])

  // Handle category selection - only move to quick flow if enabled
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    if (transactionType === "expense" && useQuickFlow) {
      const items = getQuickItemsForCategory(categoryId)
      if (items.length > 0) {
        setQuickFlowStep("item")
      } else {
        // No quick items for this category, stay on category step
        setQuickFlowStep("category")
      }
    }
  }

  // Toggle quick flow mode
  const handleToggleQuickFlow = () => {
    setUseQuickFlow(!useQuickFlow)
    if (!useQuickFlow) {
      // Entering quick flow mode
      setQuickFlowStep("category")
      setSelectedCategory(null)
      setSelectedItem(null)
      setSelectedPrice(null)
      setAmount("")
      setDescription("")
    } else {
      // Exiting quick flow mode, reset to manual
      setQuickFlowStep("category")
      setSelectedItem(null)
      setSelectedPrice(null)
    }
  }

  // Handle item selection - move to price step
  const handleItemSelect = (item: QuickItem) => {
    setSelectedItem(item)
    setDescription(item.label)
    setQuickFlowStep("price")
  }

  // Generate price options based on item's base price and category
  const generatePriceOptions = (basePrice: number, item: QuickItem | null, category: string | null): number[] => {
    const options: number[] = []
    
    // Define low-cost items that need smaller price increments
    const lowCostItems = ["coffee", "breakfast", "snacks", "drinks", "parking", "public_transport", "tip", "game"]
    const isLowCost = item && lowCostItems.includes(item.id)
    
    // Define very low-cost items (under 5 EUR typically)
    const veryLowCostItems = ["coffee", "snacks", "parking", "public_transport", "tip"]
    const isVeryLowCost = item && veryLowCostItems.includes(item.id)
    
    if (isVeryLowCost) {
      // For very low-cost items (coffee, snacks, etc.), generate prices: 1, 2, 3, 4, 5, 6, 7, 8, 10
      const prices = [1, 2, 3, 4, 5, 6, 7, 8, 10]
      prices.forEach(price => {
        if (price >= 1 && price <= 15 && !options.includes(price)) {
          options.push(price)
        }
      })
      // Always include base price
      if (basePrice > 0 && basePrice <= 15 && !options.includes(basePrice)) {
        options.push(basePrice)
      }
    } else if (isLowCost) {
      // For low-cost items (breakfast, drinks, etc.), generate prices: 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15
      const prices = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]
      prices.forEach(price => {
        if (price >= 2 && price <= 20 && !options.includes(price)) {
          options.push(price)
        }
      })
      // Always include base price
      if (basePrice > 0 && basePrice <= 20 && !options.includes(basePrice)) {
        options.push(basePrice)
      }
    } else if (basePrice <= 15) {
      // For medium-low cost items (lunch, fast food, etc.), generate: 5, 8, 10, 12, 15, 18, 20, 25
      const prices = [5, 8, 10, 12, 15, 18, 20, 25]
      prices.forEach(price => {
        if (price >= 5 && price <= 30 && !options.includes(price)) {
          options.push(price)
        }
      })
      if (basePrice > 0 && !options.includes(basePrice)) {
        options.push(basePrice)
      }
    } else if (basePrice <= 30) {
      // For medium cost items, generate: 10, 15, 20, 25, 30, 35, 40, 50
      const prices = [10, 15, 20, 25, 30, 35, 40, 50]
      prices.forEach(price => {
        if (price >= 10 && price <= 60 && !options.includes(price)) {
          options.push(price)
        }
      })
      if (basePrice > 0 && !options.includes(basePrice)) {
        options.push(basePrice)
      }
    } else {
      // For high-cost items, generate multiples of 10: 20, 30, 40, 50, 60, 70, 80, 100
      const rounded = Math.round(basePrice / 10) * 10
      for (let i = Math.max(20, rounded - 30); i <= rounded + 50; i += 10) {
        if (i > 0 && !options.includes(i)) {
          options.push(i)
        }
      }
      // Always include the base price if not already there
      if (basePrice > 0 && !options.includes(basePrice)) {
        options.push(basePrice)
      }
    }
    
    // Sort and return
    options.sort((a, b) => a - b)
    return options
  }

  // Handle price selection - ready to submit
  const handlePriceSelect = (price: number) => {
    setSelectedPrice(price)
    setAmount(price.toString())
  }

  // Handle back button
  const handleBack = () => {
    if (quickFlowStep === "price") {
      setQuickFlowStep("item")
      setSelectedPrice(null)
      setAmount("")
    } else if (quickFlowStep === "item") {
      setQuickFlowStep("category")
      setSelectedItem(null)
      setDescription("")
    }
  }

  // Handle forward navigation (swipe left)
  const handleForward = () => {
    if (quickFlowStep === "category" && selectedCategory && quickItems.length > 0) {
      setQuickFlowStep("item")
    } else if (quickFlowStep === "item" && selectedItem) {
      setQuickFlowStep("price")
    }
  }

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!useQuickFlow || transactionType !== "expense") return
    const touch = e.touches[0]
    const pos = { x: touch.clientX, y: touch.clientY }
    setTouchStart(pos)
    touchStartRef.current = pos
  }

  // Registered as non-passive via useEffect so preventDefault works
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("touchmove", handleTouchMove, { passive: false })
    return () => el.removeEventListener("touchmove", handleTouchMove)
  }, [handleTouchMove])

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Minimum swipe distance (50px) and must be more horizontal than vertical
    const minSwipeDistance = 50
    if (absDeltaX > minSwipeDistance && absDeltaX > absDeltaY) {
      // Swipe right (positive deltaX) = go back
      if (deltaX > 0 && (quickFlowStep === "item" || quickFlowStep === "price")) {
        handleBack()
      }
      // Swipe left (negative deltaX) = go forward
      else if (deltaX < 0) {
        if (quickFlowStep === "category" && selectedCategory && quickItems.length > 0) {
          handleForward()
        } else if (quickFlowStep === "item" && selectedItem) {
          handleForward()
        }
      }
    }
    setTouchStart(null)
  }

  // Swipe-down to close handlers (on header only, avoids scroll conflict)
  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setHeaderTouchStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleHeaderTouchEnd = (e: React.TouchEvent) => {
    if (!headerTouchStart) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - headerTouchStart.x
    const deltaY = touch.clientY - headerTouchStart.y
    setHeaderTouchStart(null)
    // Swipe down: >60px downward, more vertical than horizontal
    if (deltaY > 60 && Math.abs(deltaY) > Math.abs(deltaX)) {
      onOpenChange(false)
    }
  }

  // Get quick items for selected category
  const quickItems = selectedCategory && transactionType === "expense" 
    ? getQuickItemsForCategory(selectedCategory)
    : []
  
  // Price options for selected item
  const priceOptions = selectedItem ? generatePriceOptions(selectedItem.amount, selectedItem, selectedCategory) : []

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
      const next = prev === "0" && value !== "." ? value : prev + value
      // Enforce max 2 decimal places
      const decimalIndex = next.indexOf(".")
      if (decimalIndex !== -1 && next.length - decimalIndex - 1 > 2) return prev
      // Enforce max amount
      if (parseFloat(next) > AMOUNT_RULES.MAX) return prev
      return next
    })
  }

  const handleSubmit = async () => {
    if (!selectedCategory || !amount || parseFloat(amount) <= 0) {
      return
    }

    setIsSubmitting(true)
    try {
      let finalCategory = selectedCategory
      let finalCategoryId: string | undefined = undefined

      if (selectedCategory.startsWith("savings_")) {
        const id = selectedCategory.replace("savings_", "")
        const account = savingsAccounts.find(a => a.id === id)
        if (account) {
          finalCategory = account.name
          finalCategoryId = `savings_${id}`
        }
      }

      await onSubmit({
        description: description || finalCategory || (transactionType === "expense" ? "Expense" : "Income"),
        amount: parseFloat(amount),
        category: finalCategory,
        type: transactionType,
        date: formatDateForInput(new Date()),
        categoryId: finalCategoryId,
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

  // For quick flow, can submit when price is selected
  const canSubmitQuickFlow = transactionType === "expense" && 
    quickFlowStep === "price" && 
    selectedPrice !== null && 
    selectedCategory && 
    selectedItem

  // For manual entry
  const canSubmitManual = selectedCategory && amount && parseFloat(amount) > 0

  const canSubmit = transactionType === "expense" && useQuickFlow && quickFlowStep === "price" 
    ? canSubmitQuickFlow 
    : canSubmitManual

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="!h-[95dvh] max-h-[95dvh] rounded-t-3xl flex flex-col p-0 overflow-hidden"
        style={{ height: '95dvh', maxHeight: '95dvh' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className="px-4 pt-4 pb-2 flex-shrink-0 touch-none"
          onTouchStart={handleHeaderTouchStart}
          onTouchEnd={handleHeaderTouchEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2">
              {useQuickFlow && quickFlowStep !== "category" && transactionType === "expense" && (
                <button
                  onClick={handleBack}
                  className="min-w-[44px] min-h-[44px] p-2.5 rounded-lg hover:bg-accent active:bg-accent/80 transition-colors -ml-1 flex items-center justify-center touch-manipulation"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-7 w-7" />
                </button>
              )}
              <div className="flex-1">
                <SheetTitle className="text-xl font-bold">Quick Transaction</SheetTitle>
                <SheetDescription className="text-xs mt-1">
                  {transactionType === "expense" && useQuickFlow && quickFlowStep === "category" && "Select a category to get started"}
                  {transactionType === "expense" && useQuickFlow && quickFlowStep === "item" && "Choose an item"}
                  {transactionType === "expense" && useQuickFlow && quickFlowStep === "price" && "Select approximate price"}
                  {transactionType === "expense" && !useQuickFlow && "Select category, enter amount, and save"}
                  {transactionType === "income" && "Select type, category, enter amount, and save"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 pb-2 min-h-0 touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex flex-col gap-2.5">
            {/* Transaction Type Selector - Always visible */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={transactionType === "expense"}
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
                  aria-pressed={transactionType === "income"}
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

            {/* Quick Flow Toggle Button - Only for Expenses */}
            {transactionType === "expense" && (
              <div>
                <button
                  type="button"
                  aria-pressed={useQuickFlow}
                  onClick={handleToggleQuickFlow}
                  className={cn(
                    "w-full py-2 px-4 rounded-lg border-2 text-sm font-semibold transition-all",
                    useQuickFlow
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {useQuickFlow ? "✓ Quick Add Mode" : "⚡ Use Quick Add"}
                </button>
              </div>
            )}

            {/* Quick Flow for Expenses */}
            {transactionType === "expense" && useQuickFlow && quickFlowStep === "category" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {quickExpenseCategories.map((category) => {
                    const Icon = category.icon || CircleDot
                    const bgColor = category.color || CATEGORY_COLOR_MAP[category.id] || "bg-gray-500"
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategorySelect(category.id)}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all",
                          "active:scale-95",
                          "border-border hover:border-primary/50"
                        )}
                      >
                        <div
                          className={cn(
                            "p-1.5 rounded-full text-white flex items-center justify-center",
                            bgColor
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-medium leading-tight text-center">{category.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {transactionType === "expense" && useQuickFlow && quickFlowStep === "item" && quickItems.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Item</Label>
                <div className="grid grid-cols-2 gap-2">
                  {quickItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemSelect(item)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all",
                        "active:scale-95",
                        "border-border hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      <span className="text-3xl">{item.emoji || "📦"}</span>
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className="text-xs text-muted-foreground">€{item.amount.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {transactionType === "expense" && useQuickFlow && quickFlowStep === "price" && priceOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Price</Label>
                <div className="text-center py-2 mb-2">
                  <p className="text-sm text-muted-foreground">{selectedItem?.label}</p>
                  <p className="text-xs text-muted-foreground">Suggested: €{selectedItem?.amount.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {priceOptions.map((price) => {
                    const isSelected = selectedPrice === price
                    return (
                      <button
                        key={price}
                        type="button"
                        onClick={() => handlePriceSelect(price)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 p-4 rounded-lg border-2 transition-all",
                          "active:scale-95",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-bold"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-lg font-semibold">€{price}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Manual Entry (Income or when quick flow is disabled) */}
            {(transactionType === "income" || (transactionType === "expense" && !useQuickFlow)) && (
              <>
              {/* Category Selection for Manual Entry */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {categories.map((category) => {
                    const Icon = category.icon || CircleDot
                    const isSelected = selectedCategory === category.id
                    const bgColor = category.color || CATEGORY_COLOR_MAP[category.id] || "bg-gray-500"
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
                            "p-1.5 rounded-full text-white flex items-center justify-center",
                            bgColor
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
                  
                  {/* Active Savings Accounts inside manual Expense */}
                  {transactionType === "expense" && savingsAccounts.length > 0 && (
                    <div className="col-span-3 pb-1 pt-2 my-2 border-t w-full text-xs font-semibold text-muted-foreground text-center bg-transparent">
                      Savings Accounts
                    </div>
                  )}
                  {transactionType === "expense" && savingsAccounts.map((account) => {
                    const accountId = `savings_${account.id}`
                    const isSelected = selectedCategory === accountId
                    return (
                      <button
                        key={accountId}
                        type="button"
                        onClick={() => setSelectedCategory(accountId)}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all",
                          "active:scale-95",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                         <div className="p-1.5 rounded-full text-white flex items-center justify-center bg-gray-600">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-medium leading-tight text-center">{account.name}</span>
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
                    onChange={(e) => {
                      setDescription(e.target.value)
                      setDescriptionManuallyEdited(true)
                    }}
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
                    aria-label={key === "backspace" ? "Delete last digit" : key}
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
                      <Delete className="h-4 w-4" />
                    ) : (
                      key
                    )}
                  </button>
                ))}
              </div>
              </>
            )}
          </div>
        </div>

        {/* Submit Button - Fixed at bottom */}
        <div className="px-4 pb-4 pt-2 border-t flex-shrink-0 bg-background">
          {transactionType === "expense" && useQuickFlow && quickFlowStep === "price" && selectedPrice !== null && (
            <div className="mb-2 text-center">
              <p className="text-xs text-muted-foreground">Selected: {selectedItem?.label} - €{selectedPrice.toFixed(2)}</p>
            </div>
          )}
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

