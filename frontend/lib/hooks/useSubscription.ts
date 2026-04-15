"use client"

import { useEffect, useState } from "react"
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

export type PlanTier = "free" | "pro" | "business"
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"

export interface SubscriptionData {
  tier: PlanTier
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  priceId: string | null
  cancelAtPeriodEnd: boolean
}

export interface UseSubscriptionReturn {
  subscription: SubscriptionData | null
  loading: boolean
  error: Error | null
  isPro: boolean
  isBusiness: boolean
  tier: PlanTier
}

function resolveTier(role: string | undefined | null): PlanTier {
  if (!role) return "free"
  const normalized = role.toLowerCase()
  if (normalized === "business" || normalized === "enterprise") return "business"
  if (normalized === "pro" || normalized === "premium") return "pro"
  return "free"
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

    const subscriptionsRef = collection(db, "customers", user.uid, "subscriptions")
    const activeQuery = query(
      subscriptionsRef,
      where("status", "in", ["active", "trialing", "past_due"])
    )

    const unsubscribe = onSnapshot(
      activeQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setSubscription(null)
          setLoading(false)
          return
        }

        const subDoc = snapshot.docs[0]
        const data = subDoc.data()

        const currentPeriodEnd = data.current_period_end
          ? data.current_period_end instanceof Timestamp
            ? data.current_period_end.toDate()
            : new Date(data.current_period_end.seconds * 1000)
          : null

        const priceId = data.items?.[0]?.price?.id ?? data.price?.id ?? null
        const role = data.role ?? null

        // past_due retains Pro access for 7 days after period end to allow payment retry
        const gracePeriodExpired =
          data.status === "past_due" &&
          currentPeriodEnd !== null &&
          currentPeriodEnd.getTime() + GRACE_PERIOD_MS < Date.now()

        setSubscription({
          tier: gracePeriodExpired ? "free" : resolveTier(role),
          status: data.status as SubscriptionStatus,
          currentPeriodEnd,
          priceId,
          cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
        })
        setLoading(false)
      },
      (err) => {
        console.error("Error listening to subscriptions:", err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  const tier = subscription?.tier ?? "free"

  return {
    subscription,
    loading,
    error,
    isPro: tier === "pro" || tier === "business",
    isBusiness: tier === "business",
    tier,
  }
}
