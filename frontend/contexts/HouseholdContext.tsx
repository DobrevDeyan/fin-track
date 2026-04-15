"use client"

/**
 * HouseholdContext
 *
 * Loads household data via the getMyHousehold Cloud Function (Admin SDK —
 * bypasses Firestore rules and cache). The onSnapshot listener provides
 * live updates for member joins/leaves AFTER the initial load.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"
import {
  callGetMyHousehold,
  callGetHouseholdEntries,
  type HouseholdEntry,
} from "@/lib/firestore-household"
import type { HouseholdDocument } from "@/lib/firestore-types"

interface HouseholdContextType {
  household: HouseholdDocument | null
  householdId: string | null
  isHouseholdMode: boolean
  setIsHouseholdMode: (v: boolean) => void
  householdEntries: HouseholdEntry[]
  householdEntriesLoading: boolean
  refreshHouseholdEntries: () => void
  refreshHousehold: () => Promise<void>
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

  // 1. Load household via Cloud Function — returns both ID and document data,
  //    so we never depend on the Firestore client cache to resolve the household.
  useEffect(() => {
    if (!user) {
      setHouseholdId(null)
      setHousehold(null)
      setLoading(false)
      setIsHouseholdMode(false)
      return
    }

    setLoading(true)

    callGetMyHousehold()
      .then((result) => {
        const { householdId: hid, household: hdata } = result.data
        setHouseholdId(hid ?? null)
        if (hdata) {
          // Cast to HouseholdDocument — Timestamps aren't needed here
          // (members list uses displayName/email/uid which are plain strings)
          setHousehold(hdata as unknown as HouseholdDocument)
        } else {
          setHousehold(null)
        }
      })
      .catch(() => {
        setHouseholdId(null)
        setHousehold(null)
      })
      .finally(() => setLoading(false))
  }, [user])

  // 2. Once we have the householdId, set up a live listener for member changes.
  //    We never clear `household` on listener error — the CF-loaded value stays.
  useEffect(() => {
    unsubHouseholdRef.current?.()
    unsubHouseholdRef.current = null

    if (!householdId) return

    const ref = doc(db, "households", householdId)
    unsubHouseholdRef.current = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setHousehold(snap.data() as HouseholdDocument)
        }
        // If doc disappears (household deleted), clear it
        else {
          setHousehold(null)
          setHouseholdId(null)
        }
      },
      // On permission error: keep the CF-loaded value — don't clear household
      () => {}
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

  const refreshHousehold = useCallback(async () => {
    if (!user) return
    try {
      const result = await callGetMyHousehold()
      const { householdId: hid, household: hdata } = result.data
      setHouseholdId(hid ?? null)
      setHousehold(hdata ? (hdata as unknown as HouseholdDocument) : null)
    } catch {
      // keep existing state on error
    }
  }, [user])

  const value: HouseholdContextType = {
    household,
    householdId,
    isHouseholdMode,
    setIsHouseholdMode,
    householdEntries,
    householdEntriesLoading,
    refreshHouseholdEntries: fetchHouseholdEntries,
    refreshHousehold,
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
