"use client"

/**
 * Insights Context
 *
 * Provides all AI-powered and algorithmic financial insight features:
 *   - Financial Health Score (pure algorithmic)
 *   - Spending Anomaly Detection (pure algorithmic)
 *   - Cash Flow Forecast (pure algorithmic)
 *   - AI Monthly Digest (Gemini Flash via ML service)
 *   - AI Budget Coach Chat (Gemini Flash via ML service)
 *
 * Must be placed inside FinancialSummaryProvider, BudgetsProvider,
 * GoalsProvider, and RecurringProvider.
 */

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { useAuth } from "@/contexts/AuthContext"
import { auth } from "@/lib/firebase"
import { useFinancialSummary } from "./FinancialSummaryContext"
import { useBudgetsContext } from "./BudgetsContext"
import { useGoalsContext } from "./GoalsContext"
import { useRecurringContext } from "./RecurringContext"
import {
  calculateHealthScore,
  detectAnomalies,
  generateCashFlowForecast,
  buildSpendingContext,
  computeDigestFingerprint,
  getCurrentMonthKey,
  type HealthScore,
  type Anomaly,
  type ForecastPoint,
} from "@/lib/insights-engine"
import { getAIDigest, saveAIDigest } from "@/lib/firestore-insights"
import { fetchAIDigest, fetchAIChatResponse, type ChatMessage } from "@/lib/insights-api"
import { useMoney } from "@/contexts/CurrencyContext"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { logger } from "@/lib/utils/logger"

// ─── Context Value ────────────────────────────────────────────────────────────

interface InsightsContextValue {
  // Algorithmic features (always available)
  healthScore: HealthScore | null
  anomalies: Anomaly[]
  cashFlowData: ForecastPoint[]

  // AI Digest
  digestText: string | null
  digestLoading: boolean
  digestNotConfigured: boolean
  refreshDigest: (force?: boolean) => Promise<void>

  // AI Chat
  chatMessages: ChatMessage[]
  chatLoading: boolean
  chatNotConfigured: boolean
  sendMessage: (text: string) => Promise<void>
  clearChat: () => void
}

const InsightsContext = createContext<InsightsContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

interface InsightsProviderProps {
  children: ReactNode
}

export function InsightsProvider({ children }: InsightsProviderProps) {
  const { user } = useAuth()
  const { summary, totalBalance, loading: summaryLoading } = useFinancialSummary()
  const { budgets, loadBudgets } = useBudgetsContext()
  const { goals, loadGoals } = useGoalsContext()
  const { recurringTransactions } = useRecurringContext()
  const { fromBase, currency, ratesReady } = useMoney()
  const t = useTranslations("insights")

  // Currency the AI amounts are labelled with. While fixings aren't loaded yet,
  // fromBase is identity (EUR), so label as EUR to stay consistent rather than
  // mislabel raw EUR numbers as the user's currency. (I9-1)
  const aiCurrency = ratesReady ? currency : "EUR"

  // Ensure goals are loaded (Goals section may not be mounted on dashboard)
  const goalsLoadedRef = useRef(false)
  useEffect(() => {
    if (user && !goalsLoadedRef.current && goals.length === 0 && !summaryLoading) {
      goalsLoadedRef.current = true
      loadGoals()
    }
  }, [user, goals.length, summaryLoading, loadGoals])

  // ── Algorithmic features (memoized) ──────────────────────────────────────

  const healthScore = useMemo<HealthScore | null>(() => {
    if (summaryLoading || !summary) return null
    return calculateHealthScore(summary, budgets, goals)
  }, [summary, budgets, goals, summaryLoading])

  const anomalies = useMemo<Anomaly[]>(() => {
    if (summaryLoading || !summary) return []
    return detectAnomalies(summary)
  }, [summary, summaryLoading])

  const cashFlowData = useMemo<ForecastPoint[]>(() => {
    if (summaryLoading) return []
    return generateCashFlowForecast(recurringTransactions, summary, totalBalance)
  }, [recurringTransactions, summary, totalBalance, summaryLoading])

  // ── AI Digest ─────────────────────────────────────────────────────────────

  const [digestText, setDigestText] = useState<string | null>(null)
  const [digestLoading, setDigestLoading] = useState(false)
  const [digestNotConfigured, setDigestNotConfigured] = useState(false)

  const refreshDigest = useCallback(
    async (force = false) => {
      if (!user || summaryLoading || !summary) return

      const monthKey = getCurrentMonthKey()
      const context = buildSpendingContext(summary, budgets, goals, anomalies, {
        convert: fromBase,
        currency: aiCurrency,
      })
      if (!context) return

      // Fingerprint the data the digest is generated from so a cached digest is only
      // served while it still reflects the current numbers (I9-3).
      const fingerprint = computeDigestFingerprint(context)

      // Try cache first (unless forced)
      if (!force) {
        const cached = await getAIDigest(user.uid, monthKey, fingerprint)
        if (cached) {
          setDigestText(cached)
          return
        }
      }

      setDigestLoading(true)
      try {
        const token = await auth.currentUser?.getIdToken()
        if (!token) return

        const result = await fetchAIDigest(context, token)
        if (!result.ok) {
          // Only flag "not configured" for an actual 503; a transient failure gets a
          // retryable error toast instead of a misleading "add an API key". (I9-10)
          if (result.reason === "not_configured") setDigestNotConfigured(true)
          else toast.error(t("digestFailed"))
          return
        }

        setDigestText(result.data)
        await saveAIDigest(user.uid, monthKey, result.data, fingerprint)
      } finally {
        setDigestLoading(false)
      }
    },
    [user, summary, summaryLoading, budgets, goals, anomalies, fromBase, aiCurrency, t]
  )

  // ── AI Chat ───────────────────────────────────────────────────────────────

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatNotConfigured, setChatNotConfigured] = useState(false)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || chatLoading || !summary) return

      const userMessage: ChatMessage = { role: "user", content: text }
      setChatMessages((prev) => [...prev, userMessage])
      setChatLoading(true)

      try {
        const context = buildSpendingContext(summary, budgets, goals, anomalies, {
          convert: fromBase,
          currency: aiCurrency,
        })
        if (!context) return

        const token = await auth.currentUser?.getIdToken()
        if (!token) return

        // Cap history sent to the model so a long session doesn't grow the payload
        // (cost + latency) unbounded. (I9-12)
        const history = chatMessages.slice(-10)
        const result = await fetchAIChatResponse(text, context, history, token)
        if (!result.ok) {
          if (result.reason === "not_configured") {
            // Permanent: remember it so the UI hides inputs/prompts. (I9-8)
            setChatNotConfigured(true)
            setChatMessages((prev) => [
              ...prev,
              { role: "assistant", content: t("chatNotConfiguredBubble") },
            ])
          } else {
            // Transient failure (network error, rate limit, etc.) — retryable.
            toast.error(t("chatFailed"))
            setChatMessages((prev) => [
              ...prev,
              { role: "assistant", content: t("chatFailedBubble") },
            ])
          }
          return
        }

        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.data },
        ])
      } catch (err) {
        logger.error("AI chat sendMessage error", err)
        toast.error(t("chatFailed"))
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("chatError") },
        ])
      } finally {
        setChatLoading(false)
      }
    },
    [chatMessages, chatLoading, summary, budgets, goals, anomalies, fromBase, aiCurrency, t]
  )

  const clearChat = useCallback(() => {
    setChatMessages([])
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  const value: InsightsContextValue = useMemo(
    () => ({
      healthScore,
      anomalies,
      cashFlowData,
      digestText,
      digestLoading,
      digestNotConfigured,
      refreshDigest,
      chatMessages,
      chatLoading,
      chatNotConfigured,
      sendMessage,
      clearChat,
    }),
    [
      healthScore,
      anomalies,
      cashFlowData,
      digestText,
      digestLoading,
      digestNotConfigured,
      refreshDigest,
      chatMessages,
      chatLoading,
      chatNotConfigured,
      sendMessage,
      clearChat,
    ]
  )

  return (
    <InsightsContext.Provider value={value}>
      {children}
    </InsightsContext.Provider>
  )
}

export function useInsightsContext() {
  const ctx = useContext(InsightsContext)
  if (!ctx) {
    throw new Error("useInsightsContext must be used within InsightsProvider")
  }
  return ctx
}
