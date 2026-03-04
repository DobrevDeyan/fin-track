"use client"

/**
 * Anomaly Alert
 *
 * Renders a dismissible banner when spending anomalies are detected.
 * Uses Z-score analysis on the last 6 months of category spending.
 * Only renders when anomalies exist; invisible otherwise.
 */

import { useState } from "react"
import { AlertTriangle, X, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"

function formatCurrency(amount: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AnomalyAlert({ userCurrency = "EUR" }: { userCurrency?: string }) {
  const { anomalies } = useInsightsContext()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || anomalies.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
            {anomalies.length === 1
              ? "Unusual spending detected"
              : `${anomalies.length} unusual spending patterns detected`}
          </h4>
          <ul className="space-y-1.5">
            {anomalies.map((a) => (
              <li key={a.category} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                <span>
                  <span className="font-medium">{a.category}:</span>{" "}
                  {formatCurrency(a.current, userCurrency)} this month
                  {a.average > 0 && (
                    <>
                      {" "}
                      vs{" "}
                      <span className="font-medium">
                        {formatCurrency(a.average, userCurrency)}
                      </span>{" "}
                      average
                    </>
                  )}
                  {" "}
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    (+{Math.round(a.changePercent)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Dismiss */}
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
