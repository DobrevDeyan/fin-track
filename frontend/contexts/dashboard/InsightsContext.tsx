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
  type HealthScore,
  type Anomaly,
  type ForecastPoint,
} from "@/lib/insights-engine"
import { getAIDigest, saveAIDigest } from "@/lib/firestore-insights"
import { fetchAIDigest, fetchAIChatResponse, type ChatMessage } from "@/lib/insights-api"

function getCurrentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

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

      // Try cache first (unless forced)
      if (!force) {
        const cached = await getAIDigest(user.uid, monthKey)
        if (cached) {
          setDigestText(cached)
          return
        }
      }

      setDigestLoading(true)
      try {
        const context = buildSpendingContext(summary, budgets, goals, anomalies)
        if (!context) return

        const token = await auth.currentUser?.getIdToken()
        if (!token) return

        const digest = await fetchAIDigest(context, token)
        if (digest === null) {
          setDigestNotConfigured(true)
          return
        }

        setDigestText(digest)
        await saveAIDigest(user.uid, monthKey, digest)
      } finally {
        setDigestLoading(false)
      }
    },
    [user, summary, summaryLoading, budgets, goals, anomalies]
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
        const context = buildSpendingContext(summary, budgets, goals, anomalies)
        if (!context) return

        const token = await auth.currentUser?.getIdToken()
        if (!token) return

        const response = await fetchAIChatResponse(text, context, chatMessages, token)
        if (response === null) {
          setChatNotConfigured(true)
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "AI features are not configured yet. Please add a Gemini API key to the ML service.",
            },
          ])
          return
        }

        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: response },
        ])
      } finally {
        setChatLoading(false)
      }
    },
    [chatMessages, chatLoading, summary, budgets, goals, anomalies]
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
