"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { NextIntlClientProvider } from "next-intl"
import { useAuth } from "./AuthContext"
import { getUserDocument } from "@/lib/firestore-users"
import { type Locale, defaultLocale, locales } from "@/i18n/config"

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  loading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMessages = useCallback(async (loc: Locale) => {
    try {
      const msgs = (await import(`../messages/${loc}.json`)).default
      setMessages(msgs)
    } catch {
      // Fallback to English
      const msgs = (await import(`../messages/en.json`)).default
      setMessages(msgs)
    }
  }, [])

  // Load user's saved language preference
  useEffect(() => {
    const loadUserLanguage = async () => {
      if (!user) {
        setLocaleState(defaultLocale)
        await loadMessages(defaultLocale)
        setLoading(false)
        return
      }

      try {
        const userDoc = await getUserDocument(user.uid)
        const savedLang = userDoc?.language as Locale
        if (savedLang && locales.includes(savedLang)) {
          setLocaleState(savedLang)
          await loadMessages(savedLang)
        } else {
          await loadMessages(defaultLocale)
        }
      } catch {
        await loadMessages(defaultLocale)
      } finally {
        setLoading(false)
      }
    }

    loadUserLanguage()
  }, [user, loadMessages])

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
