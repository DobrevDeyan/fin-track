"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type UIMode = "simple" | "full"

interface UIComplexityContextValue {
  mode: UIMode
  setMode: (m: UIMode) => void
  toggle: () => void
}

const UIComplexityContext = createContext<UIComplexityContextValue>({
  mode: "full",
  setMode: () => {},
  toggle: () => {},
})

export function UIComplexityProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UIMode>(() => {
    if (typeof window === "undefined") return "full"
    return (localStorage.getItem("pocket_ui_mode") as UIMode) ?? "full"
  })

  const setMode = (m: UIMode) => {
    localStorage.setItem("pocket_ui_mode", m)
    setModeState(m)
  }

  const toggle = () => setMode(mode === "simple" ? "full" : "simple")

  return (
    <UIComplexityContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </UIComplexityContext.Provider>
  )
}

export const useUIMode = () => useContext(UIComplexityContext)
