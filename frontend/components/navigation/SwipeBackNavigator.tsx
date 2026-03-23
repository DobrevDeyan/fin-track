"use client"

/**
 * SwipeBackNavigator
 *
 * Adds an iOS-style edge swipe-back gesture to all app pages.
 * Touch must begin within 40 px of the left edge, travel ≥80 px rightward,
 * and stay more horizontal than vertical — then router.back() is called.
 *
 * Uses document-level passive listeners so it doesn't interfere with
 * in-page scroll or other touch handlers (sheets, drawers, calendar).
 */

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export function SwipeBackNavigator({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const startRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      // Only track gestures that begin in the left-edge zone
      startRef.current = t.clientX <= 40 ? { x: t.clientX, y: t.clientY } : null
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!startRef.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - startRef.current.x
      const dy = Math.abs(t.clientY - startRef.current.y)
      startRef.current = null
      if (dx >= 80 && dy < dx) {
        router.back()
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [router])

  return <>{children}</>
}
