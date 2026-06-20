"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { getUserEntriesWithReceipts } from "@/lib/firestore-entries"
import { formatDate } from "@/lib/date-utils"
import { useMoney } from "@/contexts/CurrencyContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Receipt, ExternalLink, ChevronLeft, ChevronRight, ScanLine } from "lucide-react"
import type { EntryDocument } from "@/lib/firestore-types"
import { Timestamp } from "firebase/firestore"
import { useScanQuota } from "@/lib/hooks/useScanQuota"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { UpgradePrompt } from "@/components/ui/UpgradePrompt"

type EntryWithId = EntryDocument & { id: string }

function toDateString(date: Timestamp | Date | string): string {
  if (date instanceof Timestamp) return date.toDate().toISOString()
  if (date instanceof Date) return date.toISOString()
  return date
}

export default function ReceiptsPage() {
  const t = useTranslations("receipts")
  const tCommon = useTranslations("common")
  const { user, loading } = useAuth()
  const { format } = useMoney()
  const { remaining, limit, count } = useScanQuota()
  const { isPro, loading: subLoading } = useSubscription()

  const [entries, setEntries] = useState<EntryWithId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      setIsLoading(true)
      setError(null)
      const data = await getUserEntriesWithReceipts(user.uid)
      setEntries(data)
    } catch {
      setError(t("error"))
    } finally {
      setIsLoading(false)
    }
  }, [user, t])

  useEffect(() => {
    if (!loading) load()
  }, [loading, load])

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const prevReceipt = () => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))
  const nextReceipt = () =>
    setLightboxIndex((i) => (i !== null && i < entries.length - 1 ? i + 1 : i))

  if (loading || isLoading) {
    return (
      <div className="container py-8 px-4 sm:px-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const activeLightboxEntry = lightboxIndex !== null ? entries[lightboxIndex] : null

  return (
    <div className="container py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
      </div>

      {/* Scan quota / upgrade prompt */}
      {!subLoading && (
        !isPro ? (
          <div className="mb-6">
            <UpgradePrompt
              feature="Receipt Scanning"
              description="Scan and attach receipts to your transactions. Upgrade to Pro for 30 scans/month."
            />
          </div>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-4 px-5 flex items-center gap-4">
              <ScanLine className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">Receipt scans this month</span>
                  <span className="text-sm text-muted-foreground">{count} / {limit}</span>
                </div>
                <Progress value={limit > 0 ? (count / limit) * 100 : 0} className="h-1.5" />
              </div>
              <Badge variant={remaining === 0 ? "destructive" : remaining <= 5 ? "secondary" : "outline"} className="shrink-0">
                {remaining} left
              </Badge>
            </CardContent>
          </Card>
        )
      )}

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-4 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Receipt className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold mb-1">{t("noReceipts")}</h2>
          <p className="text-muted-foreground text-sm max-w-sm">{t("noReceiptsDescription")}</p>
          <p className="text-muted-foreground text-xs mt-4">
            Use the receipt scanner on the dashboard when adding a transaction.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {entries.length} {entries.length === 1 ? "receipt" : "receipts"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {entries.map((entry, index) => (
              <button
                key={entry.id}
                onClick={() => openLightbox(index)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.receiptUrl!}
                  alt={entry.description}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                {/* Overlay with info */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
                  <p className="text-white text-xs font-medium truncate">{entry.description}</p>
                  <p className="text-white/80 text-xs">
                    {format(entry.amount)}
                  </p>
                </div>
                {/* Type badge */}
                <div className="absolute top-1.5 right-1.5">
                  <Badge
                    variant={entry.type === "income" ? "default" : "secondary"}
                    className="text-[10px] px-1 py-0"
                  >
                    {entry.type === "income" ? tCommon("income") : tCommon("expense")}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {activeLightboxEntry && (
            <>
              <DialogHeader className="px-4 pt-4 pb-2">
                <DialogTitle className="text-base font-semibold truncate pr-8">
                  {activeLightboxEntry.description}
                </DialogTitle>
              </DialogHeader>

              {/* Receipt image */}
              <div className="relative bg-muted max-h-[60vh] overflow-auto flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeLightboxEntry.receiptUrl!}
                  alt={activeLightboxEntry.description}
                  className="max-w-full object-contain"
                />
              </div>

              {/* Meta + actions */}
              <div className="px-4 py-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {format(activeLightboxEntry.amount)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {activeLightboxEntry.category}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(toDateString(activeLightboxEntry.date))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(activeLightboxEntry.receiptUrl!, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                </div>
              </div>

              {/* Navigation arrows */}
              {entries.length > 1 && (
                <div className="absolute inset-y-0 left-0 right-0 pointer-events-none flex items-center justify-between px-2">
                  <button
                    className="pointer-events-auto p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={prevReceipt}
                    disabled={lightboxIndex === 0}
                    aria-label="Previous receipt"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="pointer-events-auto p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed"
                    onClick={nextReceipt}
                    disabled={lightboxIndex === entries.length - 1}
                    aria-label="Next receipt"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
