/**
 * Currency Context
 * 
 * Provides user's currency preference throughout the application
 */

"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "./AuthContext"
import { getUserDocument } from "@/lib/firestore-users"
import { type SupportedCurrency, DEFAULT_CURRENCY, BASE_CURRENCY } from "@/lib/constants/currency.constants"
import { fetchExchangeRates, convertAmount as _convertAmount, type ExchangeRates } from "@/lib/exchange-rate"
import { formatCurrency, type CurrencyFormatOptions } from "@/lib/currency-utils"
import { logger } from "@/lib/utils/logger"


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
  /**
   * Format a BASE_CURRENCY (EUR) amount for display: converts base → the user's
   * display currency using today's fixing, then formats with that currency's symbol.
   * Use this for every stored monetary value shown in the UI.
   */
  formatMoney: (amountInBase: number, options?: CurrencyFormatOptions) => string
  /**
   * Convert a user-entered amount (in `from`, default the display currency) into
   * BASE_CURRENCY (EUR) for storage. Use on every monetary input before persisting.
   */
  toBaseCurrency: (amount: number, from?: SupportedCurrency) => number
  /** Numeric inverse of toBaseCurrency: stored EUR → display currency number (use for form pre-fill on edit). */
  convertFromBase: (eurAmount: number) => number
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
      .catch((err) => logger.warn("Exchange rate fetch failed", { error: err }))
  }, [])

  const convertAmount = useCallback(
    (amount: number, from: SupportedCurrency, to: SupportedCurrency) => {
      if (!exchangeRates) return amount
      return _convertAmount(amount, from, to, exchangeRates)
    },
    [exchangeRates]
  )

  // Display: BASE_CURRENCY (EUR) stored amount → user's display currency, formatted.
  const formatMoney = useCallback(
    (amountInBase: number, options?: CurrencyFormatOptions) =>
      formatCurrency(
        exchangeRates ? _convertAmount(amountInBase, BASE_CURRENCY, userCurrency, exchangeRates) : amountInBase,
        { currency: userCurrency, ...options }
      ),
    [exchangeRates, userCurrency]
  )

  // Input: user-entered amount (in `from`, default display currency) → EUR for storage.
  const toBaseCurrency = useCallback(
    (amount: number, from: SupportedCurrency = userCurrency) =>
      exchangeRates ? _convertAmount(amount, from, BASE_CURRENCY, exchangeRates) : amount,
    [exchangeRates, userCurrency]
  )

  // Numeric display conversion: stored EUR → display currency as a number (for form pre-fill on edit).
  const convertFromBase = useCallback(
    (eurAmount: number) =>
      exchangeRates ? _convertAmount(eurAmount, BASE_CURRENCY, userCurrency, exchangeRates) : eurAmount,
    [exchangeRates, userCurrency]
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
      setOnboardingCompleted(userDoc?.onboardingCompleted ?? false)
    } catch (error) {
      logger.error("Error loading user currency", error)
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
    <CurrencyContext.Provider value={{ userCurrency, loading, refreshCurrency, displayName, monthlyBudget, onboardingCompleted, exchangeRates, convertAmount, formatMoney, toBaseCurrency, convertFromBase }}>
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

/**
 * Convenience hook for monetary values.
 *  - `format(amountInEur)` → display string in the user's currency (converted).
 *  - `toBase(amount, from?)` → EUR value for storage.
 *  - `currency` → the user's current display currency.
 */
export function useMoney() {
  const { formatMoney, toBaseCurrency, convertFromBase, userCurrency, exchangeRates } = useCurrency()
  return {
    format: formatMoney,
    toBase: toBaseCurrency,
    fromBase: convertFromBase,
    currency: userCurrency,
    // False until live fixings have loaded. While false, toBase/fromBase are
    // identity, so callers that need an accurate conversion (non-EUR display)
    // should wait before persisting an amount (review S-16).
    ratesReady: exchangeRates !== null,
  }
}

