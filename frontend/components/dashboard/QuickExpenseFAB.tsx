"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { QuickExpenseSheet } from "./QuickExpenseSheet"
import { cn } from "@/lib/utils"

interface QuickExpenseFABProps {
  onSubmit: (data: {
    description: string
    amount: number
    category: string
    type: "income" | "expense"
    date: string
    categoryId?: string
  }) => Promise<void>
  savingsAccounts?: any[]
}

export function QuickExpenseFAB({ onSubmit, savingsAccounts = [] }: QuickExpenseFABProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl",
          "bg-black",
          "hover:bg-gray-900",
          "border-0",
          "z-50",
          "transition-all duration-300",
          "hover:scale-110 active:scale-95",
          "md:bottom-8 md:right-8 md:h-14 md:w-14",
          "flex items-center justify-center",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        )}
        aria-label="Add quick expense"
      >
        <Plus 
          className="h-8 w-8 md:h-6 md:w-6 text-white"
          strokeWidth={3}
          fill="none"
        />
      </button>
      <QuickExpenseSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        onSubmit={onSubmit}
        savingsAccounts={savingsAccounts}
      />
    </>
  )
}

