/**
 * Currency Context
 * 
 * Provides user's currency preference throughout the application
 */

"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "./AuthContext"
import { getUserDocument } from "@/lib/firestore-users"
import { type SupportedCurrency, DEFAULT_CURRENCY } from "@/lib/constants/currency.constants"
import { fetchExchangeRates, convertAmount as _convertAmount, type ExchangeRates } from "@/lib/exchange-rate"

interface CurrencyContextType {
  userCurrency: SupportedCurrency
  loading: boolean
  refreshCurrency: () => Promise<void>
  displayName?: string
  monthlyBudget?: number
  onboardingCompleted?: boolean
  /** Live EUR↔USD fixings (null until loaded) */
  exchangeRates: ExchangeRates | null
  /** Convert an amount from one currency to another using today's fixing */
  convertAmount: (amount: number, from: SupportedCurrency, to: SupportedCurrency) => number
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [userCurrency, setUserCurrency] = useState<SupportedCurrency>(DEFAULT_CURRENCY)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState<string | undefined>()
  const [monthlyBudget, setMonthlyBudget] = useState<number | undefined>()
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | undefined>()
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)

  // Fetch live fixing once on mount
  useEffect(() => {
    fetchExchangeRates()
      .then(setExchangeRates)
      .catch((err) => console.warn("Exchange rate fetch failed:", err))
  }, [])

  const convertAmount = useCallback(
    (amount: number, from: SupportedCurrency, to: SupportedCurrency) => {
      if (!exchangeRates) return amount
      return _convertAmount(amount, from, to, exchangeRates)
    },
    [exchangeRates]
  )

  const loadUserCurrency = async () => {
    if (!user) {
      setUserCurrency(DEFAULT_CURRENCY)
      setDisplayName(undefined)
      setMonthlyBudget(undefined)
      setOnboardingCompleted(undefined)
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
      setDisplayName(userDoc?.displayName)
      setMonthlyBudget(userDoc?.monthlyBudget)
      setOnboardingCompleted(userDoc?.onboardingCompleted)
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
    <CurrencyContext.Provider value={{ userCurrency, loading, refreshCurrency, displayName, monthlyBudget, onboardingCompleted, exchangeRates, convertAmount }}>
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

