"use client"

/**
 * AchievementCard
 *
 * Renders a shareable PNG card with the user's key financial stats.
 * Opens as a dialog; user can download or share the image.
 */

import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"
import { useFinancialSummary } from "@/contexts/dashboard/FinancialSummaryContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { formatCurrency } from "@/lib/currency-utils"
import { Download, Share2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const TIER_COLORS = {
  critical:     { bg: "from-red-600 to-rose-500",    ring: "#ef4444", label: "Critical" },
  "needs-work": { bg: "from-orange-500 to-amber-400", ring: "#f97316", label: "Needs Work" },
  good:         { bg: "from-yellow-500 to-lime-400",  ring: "#eab308", label: "Good" },
  excellent:    { bg: "from-emerald-500 to-green-400",ring: "#22c55e", label: "Excellent" },
  outstanding:  { bg: "from-blue-500 to-indigo-400",  ring: "#3b82f6", label: "Outstanding" },
}

interface Props {
  open: boolean
  onClose: () => void
}

export function AchievementCard({ open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const { healthScore } = useInsightsContext()
  const { currentMonthIncome, currentMonthExpenses } = useFinancialSummary()
  const { userCurrency, displayName } = useCurrency()
  const formatAmount = (amount: number) => formatCurrency(amount, { currency: userCurrency })

  const tier = healthScore?.tier ?? "good"
  const score = healthScore?.score ?? 0
  const colors = TIER_COLORS[tier]

  const savingsRate =
    currentMonthIncome > 0
      ? Math.round(((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100)
      : 0
  const netSavings = currentMonthIncome - currentMonthExpenses
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const handleDownload = async () => {
    if (!cardRef.current) return
    setCapturing(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      })
      const url = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      a.href = url
      a.download = `pocket-stats-${new Date().toISOString().split("T")[0]}.png`
      a.click()
      toast.success("Card downloaded!")
    } catch {
      toast.error("Failed to capture card.")
    } finally {
      setCapturing(false)
    }
  }

  const handleShare = async () => {
    if (!cardRef.current) return
    if (!navigator.share) {
      await handleDownload()
      return
    }
    setCapturing(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, logging: false })
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], "pocket-stats.png", { type: "image/png" })
        try {
          await navigator.share({ files: [file], title: "My Financial Stats — Pocket" })
        } catch {
          // user cancelled share sheet — not an error
        }
        setCapturing(false)
      })
    } catch {
      toast.error("Failed to capture card.")
      setCapturing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Share your stats</DialogTitle>
        </DialogHeader>

        {/* The card that gets captured */}
        <div
          ref={cardRef}
          className={cn(
            "relative rounded-2xl overflow-hidden p-6 text-white bg-gradient-to-br select-none",
            colors.bg
          )}
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-black/10 translate-y-10 -translate-x-10" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6 relative">
            <div>
              <p className="text-xs font-medium opacity-75">Pocket · {month}</p>
              {displayName && <p className="text-sm font-semibold mt-0.5">{displayName}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">Health Score</p>
              <p className="text-3xl font-black leading-none">{score}</p>
              <p className="text-xs font-semibold opacity-90">{colors.label}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 relative">
            <StatBox label="Income" value={formatAmount(currentMonthIncome)} />
            <StatBox label="Expenses" value={formatAmount(currentMonthExpenses)} />
            <StatBox
              label="Saved"
              value={savingsRate >= 0 ? `${savingsRate}%` : "—"}
              sub={netSavings > 0 ? formatAmount(netSavings) : undefined}
            />
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-white/20 relative flex items-center justify-between">
            <p className="text-xs opacity-60">pocket-app.com</p>
            <p className="text-xs opacity-60">Track smarter. Save more.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={capturing}
            onClick={handleDownload}
          >
            {capturing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Download PNG
          </Button>
          {"share" in navigator && (
            <Button
              variant="outline"
              disabled={capturing}
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-black/15 rounded-xl p-2.5 text-center">
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className="text-sm font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs opacity-70 leading-tight mt-0.5">{sub}</p>}
    </div>
  )
}
