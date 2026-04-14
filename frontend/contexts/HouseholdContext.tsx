"use client"

/**
 * HouseholdContext
 *
 * Tracks whether the current user belongs to a household and provides:
 * - household metadata (name, members)
 * - isHouseholdMode toggle (Personal vs Family view)
 * - household entries loaded via Cloud Function
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react"
import { doc, getDocFromServer } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import {
  subscribeToHousehold,
  callGetHouseholdEntries,
  type HouseholdEntry,
} from "@/lib/firestore-household"
import type { HouseholdDocument } from "@/lib/firestore-types"

interface HouseholdContextType {
  /** The household the user belongs to, or null if none */
  household: HouseholdDocument | null
  householdId: string | null
  /** True when the user has switched to Family view */
  isHouseholdMode: boolean
  setIsHouseholdMode: (v: boolean) => void
  /** Merged entries from all household members */
  householdEntries: HouseholdEntry[]
  householdEntriesLoading: boolean
  /** Reload household entries (call after adding a new personal entry) */
  refreshHouseholdEntries: () => void
  loading: boolean
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined)

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [household, setHousehold] = useState<HouseholdDocument | null>(null)
  const [loading, setLoading] = useState(true)

  const [isHouseholdMode, setIsHouseholdMode] = useState(false)
  const [householdEntries, setHouseholdEntries] = useState<HouseholdEntry[]>([])
  const [householdEntriesLoading, setHouseholdEntriesLoading] = useState(false)

  const unsubHouseholdRef = useRef<(() => void) | null>(null)

  // 1. When user changes, look up their householdId from their user document
  useEffect(() => {
    if (!user) {
      setHouseholdId(null)
      setHousehold(null)
      setLoading(false)
      setIsHouseholdMode(false)
      return
    }

    setLoading(true)

    getDocFromServer(doc(db, "users", user.uid))
      .then((snap) => {
        const hid = snap.data()?.householdId as string | undefined
        setHouseholdId(hid ?? null)
      })
      .catch(() => setHouseholdId(null))
      .finally(() => setLoading(false))
  }, [user])

  // 2. Subscribe to the household document for real-time member/name updates
  useEffect(() => {
    unsubHouseholdRef.current?.()
    unsubHouseholdRef.current = null

    if (!householdId) {
      setHousehold(null)
      return
    }

    unsubHouseholdRef.current = subscribeToHousehold(
      householdId,
      (data) => setHousehold(data),
      () => setHousehold(null)
    )

    return () => {
      unsubHouseholdRef.current?.()
      unsubHouseholdRef.current = null
    }
  }, [householdId])

  // 3. Load household entries whenever mode switches to Family
  const fetchHouseholdEntries = useCallback(async () => {
    if (!householdId) return
    setHouseholdEntriesLoading(true)
    try {
      const result = await callGetHouseholdEntries(householdId, { limit: 200 })
      setHouseholdEntries(result.data.entries)
    } catch {
      setHouseholdEntries([])
    } finally {
      setHouseholdEntriesLoading(false)
    }
  }, [householdId])

  useEffect(() => {
    if (isHouseholdMode && householdId) {
      fetchHouseholdEntries()
    }
  }, [isHouseholdMode, householdId, fetchHouseholdEntries])

  // Reset Family mode if user leaves their household
  useEffect(() => {
    if (!householdId) setIsHouseholdMode(false)
  }, [householdId])

  const value: HouseholdContextType = {
    household,
    householdId,
    isHouseholdMode,
    setIsHouseholdMode,
    householdEntries,
    householdEntriesLoading,
    refreshHouseholdEntries: fetchHouseholdEntries,
    loading,
  }

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error("useHousehold must be used within HouseholdProvider")
  return ctx
}
