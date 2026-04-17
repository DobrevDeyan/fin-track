"use client"

import React, { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"
import { useFinancialSummary } from "@/contexts/dashboard/FinancialSummaryContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { formatCurrency } from "@/lib/currency-utils"
import { Download, Loader2 } from "lucide-react"
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

  const captureImage = async (): Promise<{ blob: Blob; file: File } | null> => {
    if (!cardRef.current) return null
    const html2canvas = (await import("html2canvas")).default
    const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null, logging: false })
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(null); return }
        resolve({ blob, file: new File([blob], "pocket-stats.png", { type: "image/png" }) })
      })
    })
  }

  const handleDownload = async () => {
    setCapturing(true)
    try {
      const result = await captureImage()
      if (!result) throw new Error()
      const url = URL.createObjectURL(result.blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `pocket-stats-${new Date().toISOString().split("T")[0]}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Card downloaded!")
    } catch {
      toast.error("Failed to capture card.")
    } finally {
      setCapturing(false)
    }
  }

  const shareImageNative = async () => {
    setCapturing(true)
    try {
      const result = await captureImage()
      if (!result) throw new Error()
      if (navigator.canShare?.({ files: [result.file] })) {
        await navigator.share({ files: [result.file], title: "My Financial Stats — Pocket" })
      } else {
        // Desktop fallback: download + instructions
        const url = URL.createObjectURL(result.blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "pocket-stats.png"
        a.click()
        URL.revokeObjectURL(url)
        toast.info("Image saved — upload it to Instagram or Facebook!")
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("Failed to share.")
    } finally {
      setCapturing(false)
    }
  }

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://pocket-app.com")}`,
      "_blank", "width=600,height=400"
    )
  }

  const shareToTwitter = () => {
    const text = `My financial health score this month: ${score}/100 — ${colors.label} 💰`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://pocket-app.com")}`,
      "_blank", "width=600,height=400"
    )
  }

  const shareToWhatsApp = () => {
    const text = `My financial stats for ${month}: Health Score ${score}/100 (${colors.label}) 💰 pocket-app.com`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  const shareToInstagram = async () => {
    // Instagram has no web share API — on mobile use native share, on desktop download + guide
    await shareImageNative()
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
        <div className="space-y-2">
          {/* Social share buttons */}
          <div className="grid grid-cols-4 gap-2">
            <SocialButton label="Facebook" disabled={capturing} onClick={shareToFacebook}>
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </SocialButton>
            <SocialButton label="Instagram" disabled={capturing} onClick={shareToInstagram}>
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </SocialButton>
            <SocialButton label="X / Twitter" disabled={capturing} onClick={shareToTwitter}>
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </SocialButton>
            <SocialButton label="WhatsApp" disabled={capturing} onClick={shareToWhatsApp}>
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </SocialButton>
          </div>
          <Button className="w-full" disabled={capturing} onClick={handleDownload}>
            {capturing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Download PNG
          </Button>
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

function SocialButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      aria-label={`Share to ${label}`}
      title={`Share to ${label}`}
      disabled={disabled}
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/40 hover:bg-muted transition-colors p-2.5 disabled:opacity-50"
    >
      {children}
      <span className="text-[10px] text-muted-foreground leading-none">{label.split(" ")[0]}</span>
    </button>
  )
}
