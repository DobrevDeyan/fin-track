/**
 * Currency Context
 * 
 * Provides user's currency preference throughout the application
 */

"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useAuth } from "./AuthContext"
import { getUserDocument } from "@/lib/firestore-users"
import { type SupportedCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currency.constants"

interface CurrencyContextType {
  userCurrency: SupportedCurrency
  loading: boolean
  refreshCurrency: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [userCurrency, setUserCurrency] = useState<SupportedCurrency>(DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(true)

  const loadUserCurrency = async () => {
    if (!user) {
      setUserCurrency(DEFAULT_CURRENCY)
      setLoading(false)
      return
    }

    try {
      const userDoc = await getUserDocument(user.uid)
      if (userDoc?.currency) {
        // Validate currency is supported
        const currency = userDoc.currency as SupportedCurrency
        if (currency === "EUR" || currency === "USD") {
          setUserCurrency(currency)
        } else {
          setUserCurrency(DEFAULT_CURRENCY)
        }
      } else {
        setUserCurrency(DEFAULT_CURRENCY)
      }
    } catch (error) {
      console.error("Error loading user currency:", error)
      setUserCurrency(DEFAULT_CURRENCY)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUserCurrency()
  }, [user])

  const refreshCurrency = async () => {
    await loadUserCurrency()
  }

  return (
    <CurrencyContext.Provider value={{ userCurrency, loading, refreshCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider")
  }
  return context
}

