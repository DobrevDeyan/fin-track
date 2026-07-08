"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { NextIntlClientProvider } from "next-intl"
import { useAuth } from "./AuthContext"
import { useUserProfile } from "./UserProfileContext"
import { type Locale, defaultLocale, locales } from "@/i18n/config"

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  loading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children, initialLocale }: { children: React.ReactNode, initialLocale: Locale }) {
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMessages = useCallback(async (loc: Locale) => {
    try {
      const msgs = (await import(`../messages/${loc}.json`)).default
      setMessages(msgs)
    } catch {
      // Fallback to English if the requested locale messages are not found
      const msgs = (await import(`../messages/en.json`)).default
      setMessages(msgs)
    }
  }, [])

  // Load user's saved language preference or use initialLocale
  useEffect(() => {
    // Mirrors the old getDoc await — don't resolve a locale (and thus load messages)
    // until the profile listener has settled, or we get a flash of the wrong locale.
    if (user && profileLoading) return

    const savedLang = profile?.language as Locale | undefined
    const loc = user && savedLang && locales.includes(savedLang) ? savedLang : initialLocale

    setLocaleState(loc)
    loadMessages(loc).finally(() => setLoading(false))
  }, [user, profile, profileLoading, loadMessages, initialLocale])

  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale)
    await loadMessages(newLocale)
  }, [loadMessages])

  // Show nothing until messages are loaded to avoid hydration issues
  if (!messages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, loading }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
