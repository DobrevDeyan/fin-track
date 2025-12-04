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
        "fixed top-4 right-4 z-50 flex items-center gap-3 p-4 rounded-lg shadow-lg border-2 animate-in slide-in-from-top-5",
        type === "success"
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
          : "bg-destructive/10 border-destructive/20 text-destructive"
      )}
    >
      {type === "success" ? (
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
      )}
      <p className="font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 text-current opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

