"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useTheme } from "next-themes"

export type AccentKey = "emerald" | "blue" | "purple" | "rose" | "orange" | "indigo"

export interface AccentPreset {
  name: string
  /** HSL triplet string for --primary in light mode */
  light: string
  /** HSL triplet string for --primary in dark mode */
  dark: string
  /** HSL triplet string for --primary-foreground (text on primary bg) */
  foreground: string
  /** Hex preview color for the swatch */
  preview: string
}

export const ACCENT_PRESETS: Record<AccentKey, AccentPreset> = {
  emerald: {
    name: "Emerald",
    light: "142 71% 38%",
    dark: "142 60% 50%",
    foreground: "0 0% 100%",
    preview: "#22a55a",
  },
  blue: {
    name: "Blue",
    light: "217 91% 48%",
    dark: "217 80% 60%",
    foreground: "0 0% 100%",
    preview: "#2563eb",
  },
  purple: {
    name: "Purple",
    light: "262 83% 52%",
    dark: "262 70% 64%",
    foreground: "0 0% 100%",
    preview: "#7c3aed",
  },
  rose: {
    name: "Rose",
    light: "351 89% 50%",
    dark: "351 75% 62%",
    foreground: "0 0% 100%",
    preview: "#e11d48",
  },
  orange: {
    name: "Orange",
    light: "25 95% 48%",
    dark: "25 90% 58%",
    foreground: "0 0% 100%",
    preview: "#ea6d0a",
  },
  indigo: {
    name: "Indigo",
    light: "239 84% 56%",
    dark: "239 75% 68%",
    foreground: "0 0% 100%",
    preview: "#4f46e5",
  },
}

const ACCENT_STORAGE_KEY = "pocket-accent"

interface ThemeContextValue {
  accent: AccentKey
  setAccent: (accent: AccentKey) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  accent: "emerald",
  setAccent: () => {},
})

/** Applies accent CSS variables to document root */
function applyAccent(accent: AccentKey, isDark: boolean) {
  const preset = ACCENT_PRESETS[accent]
  const primary = isDark ? preset.dark : preset.light
  const root = document.documentElement
  root.style.setProperty("--primary", primary)
  root.style.setProperty("--primary-foreground", preset.foreground)
  root.style.setProperty("--ring", primary)
}

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [accent, setAccentState] = useState<AccentKey>("emerald")
  const [mounted, setMounted] = useState(false)

  // Load stored accent on mount
  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentKey | null
    if (stored && stored in ACCENT_PRESETS) {
      setAccentState(stored)
    }
  }, [])

  // Re-apply whenever accent or dark/light changes
  useEffect(() => {
    if (!mounted) return
    applyAccent(accent, resolvedTheme === "dark")
  }, [accent, resolvedTheme, mounted])

  const setAccent = (newAccent: AccentKey) => {
    setAccentState(newAccent)
    localStorage.setItem(ACCENT_STORAGE_KEY, newAccent)
  }

  return (
    <ThemeContext.Provider value={{ accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useAccent = () => useContext(ThemeContext)
