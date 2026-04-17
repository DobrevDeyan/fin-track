"use client"

import { useEffect, useState } from "react"
import { doc, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import { useSubscription } from "./useSubscription"
import { SCAN_LIMITS } from "@/lib/constants/subscription.constants"
import { logger } from "@/lib/utils/logger"

export interface ScanQuotaReturn {
  count: number
  limit: number
  remaining: number
  loading: boolean
  resetAt: Date | null
}

export function useScanQuota(): ScanQuotaReturn {
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

    const docRef = doc(db, "scanUsage", user.uid)
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const currentMonth = new Date().toISOString().slice(0, 7)
          // If the doc is from a previous month, treat count as 0
          const storedCount = data.month === currentMonth ? (data.count ?? 0) : 0
          setCount(storedCount)
          const ra = data.resetAt
          setResetAt(
            ra instanceof Timestamp ? ra.toDate() : ra ? new Date(ra.seconds * 1000) : null
          )
        } else {
          setCount(0)
          setResetAt(null)
        }
        setLoading(false)
      },
      (err) => {
        logger.error("[useScanQuota] snapshot error", err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    loading,
    resetAt,
  }
}
