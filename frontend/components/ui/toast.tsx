"use client"

import { useEffect, useState } from "react"
import { CheckCircle, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToastProps {
  message: string
  type?: "success" | "error"
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = "success", onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={cn(
        "fixed top-16 left-4 right-4 z-50 flex items-start gap-3 p-3 rounded-lg shadow-lg border-2 animate-in slide-in-from-top-5",
        "sm:top-20 sm:left-auto sm:right-6 sm:max-w-md sm:p-4",
        type === "success"
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
          : "bg-destructive/10 border-destructive/20 text-destructive"
      )}
    >
      {type === "success" ? (
        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
      )}
      <p className="font-medium flex-1 text-xs sm:text-sm break-words leading-relaxed pr-1">{message}</p>
      <button
        onClick={onClose}
        className="text-current opacity-70 hover:opacity-100 flex-shrink-0 -mt-1 -mr-1 p-1"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  )
}

