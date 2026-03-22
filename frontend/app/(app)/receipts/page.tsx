"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getUserEntriesWithReceipts } from "@/lib/firestore-entries"
import { formatDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/currency-utils"
import { useCurrency } from "@/contexts/CurrencyContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Receipt, ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react"
import type { EntryDocument } from "@/lib/firestore-types"
import { Timestamp } from "firebase/firestore"

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
  const { userCurrency } = useCurrency()
  const router = useRouter()

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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
      </div>

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
          <Button
            className="mt-6"
            onClick={() => router.push("/dashboard")}
          >
            {t("scanFirst")}
          </Button>
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
                    {formatCurrency(entry.amount, { currency: entry.currency || userCurrency })}
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
                      {formatCurrency(activeLightboxEntry.amount, { currency: activeLightboxEntry.currency || userCurrency })}
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push("/dashboard")}
                  >
                    {t("viewTransaction")}
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
