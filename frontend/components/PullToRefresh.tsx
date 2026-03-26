"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

const THRESHOLD = 72 // px pull needed to trigger

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY !== 0) return
      startYRef.current = e.touches[0].clientY
      pullingRef.current = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || window.scrollY !== 0) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy > 0) {
        pullingRef.current = true
        setPullY(Math.min(dy * 0.5, THRESHOLD + 20)) // rubber band feel
      }
    }

    const onTouchEnd = async () => {
      if (!pullingRef.current) return
      const captured = pullY
      startYRef.current = null
      pullingRef.current = false

      if (captured >= THRESHOLD) {
        setRefreshing(true)
        setPullY(THRESHOLD * 0.6) // hold indicator while refreshing
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
          setPullY(0)
        }
      } else {
        setPullY(0)
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: true })
    document.addEventListener("touchend", onTouchEnd)
    return () => {
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [pullY, onRefresh])

  const progress = Math.min(pullY / THRESHOLD, 1)
  const visible = pullY > 4 || refreshing

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-50 flex justify-center transition-all duration-150"
        style={{
          top: visible ? Math.max(pullY - 28, 4) : -32,
          opacity: refreshing ? 1 : progress,
        }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-md border border-border">
          <RefreshCw
            className={`h-4 w-4 text-primary ${refreshing ? "animate-spin" : ""}`}
            style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
          />
        </div>
      </div>

      {/* Content shifts down slightly when pulling */}
      <div style={{ transform: `translateY(${refreshing ? 16 : Math.min(pullY * 0.25, 16)}px)`, transition: pullY === 0 ? "transform 0.2s ease" : undefined }}>
        {children}
      </div>
    </div>
  )
}
