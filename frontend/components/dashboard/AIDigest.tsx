"use client"

/**
 * AI Monthly Financial Digest
 *
 * Displays a Gemini-generated narrative summary of the user's current month.
 * Results are cached in Firestore (one generation per month).
 * Gracefully degrades when the AI service is not configured.
 */

import { memo, useEffect, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, RefreshCw, Info } from "lucide-react"
import { useInsightsContext } from "@/contexts/dashboard/InsightsContext"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { UpgradePrompt } from "@/components/ui/UpgradePrompt"

function getCurrentMonthLabel(locale: string): string {
  const now = new Date()
  return now.toLocaleString(locale, { month: "long", year: "numeric" })
}

export const AIDigest = memo(function AIDigest() {
  const { digestText, digestLoading, digestNotConfigured, refreshDigest } =
    useInsightsContext()
  const { isPro, loading: subscriptionLoading } = useSubscription()
  const t = useTranslations("insights")
  const locale = useLocale()

  const [autoTriggered, setAutoTriggered] = useState(false)

  // Auto-load on first mount (only for paying users)
  useEffect(() => {
    if (isPro && !autoTriggered && !digestText && !digestLoading && !digestNotConfigured) {
      setAutoTriggered(true)
      refreshDigest()
    }
  }, [isPro, autoTriggered, digestText, digestLoading, digestNotConfigured, refreshDigest])

  return (
    <Card className="drop-shadow-xl shadow-black/10 relative overflow-hidden">
      {!isPro && !subscriptionLoading && (
        <UpgradePrompt
          mode="overlay"
          feature={t("digestFeature")}
          description={t("digestUpgradeDesc")}
        />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            {t("aiDigestTitle")} — {getCurrentMonthLabel(locale)}
          </CardTitle>
          {!digestNotConfigured && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => refreshDigest(true)}
              disabled={digestLoading}
              aria-label={t("regenerateAria")}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${digestLoading ? "animate-spin" : ""}`} />
              {t("refresh")}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading skeleton */}
        {digestLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}

        {/* Not configured */}
        {!digestLoading && digestNotConfigured && (
          <div className="flex items-start gap-3 text-sm text-muted-foreground py-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">{t("notConfiguredTitle")}</p>
              <p>
                {t.rich("notConfiguredDesc", {
                  code: (chunks) => (
                    <code className="text-xs bg-muted px-1 rounded">{chunks}</code>
                  ),
                })}
              </p>
            </div>
          </div>
        )}

        {/* Digest text */}
        {!digestLoading && !digestNotConfigured && digestText && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-foreground">{digestText}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {t("generatedBy")}
            </p>
          </div>
        )}

        {/* Empty state (no data yet) */}
        {!digestLoading && !digestNotConfigured && !digestText && (
          <div className="text-sm text-muted-foreground py-2 text-center">
            {t("noSummary")}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
