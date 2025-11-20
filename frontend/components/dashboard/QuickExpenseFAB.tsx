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
    type: "expense"
    date: string
  }) => void
}

export function QuickExpenseFAB({ onSubmit }: QuickExpenseFABProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl",
          "bg-gradient-to-r from-[#F596D3] to-[#D247BF]",
          "hover:from-[#D247BF] hover:to-[#F596D3]",
          "text-white border-0",
          "z-50",
          "transition-all duration-300",
          "hover:scale-110 active:scale-95",
          "md:bottom-8 md:right-8 md:h-20 md:w-20"
        )}
        aria-label="Add quick expense"
      >
        <Plus className="h-8 w-8 md:h-10 md:w-10" strokeWidth={3} />
      </Button>

      <QuickExpenseSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        onSubmit={onSubmit}
      />
    </>
  )
}

