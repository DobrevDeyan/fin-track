"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "./AuthContext"
import { useSubscription } from "./SubscriptionContext"
import { SCAN_LIMITS } from "@/lib/constants/subscription.constants"
import { logger } from "@/lib/utils/logger"

export interface ScanQuotaReturn {
  count: number
  limit: number
  remaining: number
  loading: boolean
  resetAt: Date | null
}

const ScanQuotaContext = createContext<ScanQuotaReturn | undefined>(undefined)

export function ScanQuotaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { tier } = useSubscription()
  const [count, setCount] = useState(0)
  const [resetAt, setResetAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const limit = SCAN_LIMITS[tier]

  useEffect(() => {
    if (!user) {
      setCount(0)
      setResetAt(null)
      setLoading(false)
      return
    }

    // The quota month is keyed in UTC ("YYYY-MM") to match the server
    // (firestore-quota.ts), so the reset is the start of the next UTC month.
    // The server doesn't persist a resetAt field, so derive it client-side
    // instead of reading the always-absent doc field (review RCP-9).
    const now = new Date()
    const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

    const docRef = doc(db, "scanUsage", user.uid)
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const currentMonth = now.toISOString().slice(0, 7)
          // If the doc is from a previous month, treat count as 0
          const storedCount = data.month === currentMonth ? (data.count ?? 0) : 0
          setCount(storedCount)
        } else {
          setCount(0)
        }
        setResetAt(nextReset)
        setLoading(false)
      },
      (err) => {
        logger.error("[useScanQuota] snapshot error", err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  const value: ScanQuotaReturn = {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    loading,
    resetAt,
  }

  return (
    <ScanQuotaContext.Provider value={value}>
      {children}
    </ScanQuotaContext.Provider>
  )
}

export function useScanQuota(): ScanQuotaReturn {
  const context = useContext(ScanQuotaContext)
  if (context === undefined) {
    throw new Error("useScanQuota must be used within a ScanQuotaProvider")
  }
  return context
}
