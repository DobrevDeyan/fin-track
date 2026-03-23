/**
 * Exchange Rate Service
 *
 * Fetches real-time EUR/USD fixings from the Frankfurter API (ECB data, no API key needed).
 * Caches the result in localStorage for the calendar day to avoid redundant requests.
 */

import type { SupportedCurrency } from "@/lib/constants/currency.constants"

const CACHE_KEY = "fin_track_exchange_rate"
const FRANKFURTER_URL = "https://api.frankfurter.app/latest"

interface RateCache {
  date: string
  eurToUsd: number
  usdToEur: number
}

export interface ExchangeRates {
  eurToUsd: number
  usdToEur: number
}

function getCachedRates(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as RateCache
    const today = new Date().toISOString().split("T")[0]
    if (cache.date !== today) return null
    return { eurToUsd: cache.eurToUsd, usdToEur: cache.usdToEur }
  } catch {
    return null
  }
}

function setCachedRates(date: string, rates: ExchangeRates): void {
  try {
    const cache: RateCache = { date, ...rates }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore storage errors
  }
}

/** Fetch today's EUR↔USD fixing (cached per calendar day). */
export async function fetchExchangeRates(): Promise<ExchangeRates> {
  const cached = getCachedRates()
  if (cached) return cached

  const res = await fetch(`${FRANKFURTER_URL}?from=EUR&to=USD`)
  if (!res.ok) throw new Error(`Exchange rate fetch failed: ${res.status}`)

  const data = (await res.json()) as { date: string; rates: { USD: number } }
  const eurToUsd = data.rates.USD
  const usdToEur = 1 / eurToUsd
  const rates: ExchangeRates = { eurToUsd, usdToEur }

  setCachedRates(data.date, rates)
  return rates
}

/** Convert an amount between supported currencies using the provided rates. */
export function convertAmount(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  rates: ExchangeRates
): number {
  if (from === to) return amount
  if (from === "EUR" && to === "USD") return amount * rates.eurToUsd
  if (from === "USD" && to === "EUR") return amount * rates.usdToEur
  return amount
}
