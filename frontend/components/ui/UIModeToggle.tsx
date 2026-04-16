"use client"

import { Layers, Sparkles } from "lucide-react"
import { useUIMode } from "@/contexts/UIComplexityContext"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface UIModeToggleProps {
  /** "pill" = compact labeled pill for desktop navbar, "row" = full-width labeled row for mobile sheet */
  variant?: "pill" | "row"
}

export function UIModeToggle({ variant = "pill" }: UIModeToggleProps) {
  const { mode, toggle } = useUIMode()
  const isSimple = mode === "simple"

  if (variant === "row") {
    return (
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex items-center justify-center h-7 w-7 rounded-lg transition-colors",
            isSimple ? "bg-emerald-100 text-emerald-600" : "bg-purple-100 text-purple-600"
          )}>
            {isSimple ? <Layers className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          </div>
          <div className="text-left">
            <span className="block text-xs font-semibold leading-tight">
              {isSimple ? "Simple view" : "Full view"}
            </span>
            <span className="block text-[10px] text-muted-foreground leading-tight">
              {isSimple ? "Tap to unlock all features" : "Tap to reduce clutter"}
            </span>
          </div>
        </div>
        {/* Toggle track */}
        <div className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
          isSimple ? "bg-muted-foreground/30" : "bg-emerald-500"
        )}>
          <span className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
            isSimple ? "translate-x-0.5" : "translate-x-[18px]"
          )} />
        </div>
      </button>
    )
  }

  // pill variant for desktop navbar
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggle}
            aria-label={isSimple ? "Switch to Full view" : "Switch to Simple view"}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
              isSimple
                ? "bg-muted text-muted-foreground border-border/50 hover:text-foreground hover:border-border"
                : "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50"
            )}
          >
            {isSimple ? (
              <Layers className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="hidden lg:inline">{isSimple ? "Simple" : "Full"}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isSimple ? "Switch to Full view — unlock all features" : "Switch to Simple view — reduce clutter"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
