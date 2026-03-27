"use client"

/**
 * useNotifications hook
 *
 * - Reads current notification permission state
 * - Exposes `enable()` to request permission, get an FCM token, and save it
 *
 * Foreground message listening and SW postMessage handling live in
 * NotificationListener (global layout) so they are always active.
 */

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { requestAndGetToken } from "@/lib/firebase-messaging"
import { saveFcmToken } from "@/lib/firestore-users"

export type NotifPermission = "default" | "granted" | "denied" | "unsupported"

export function useNotifications() {
  const { user } = useAuth()
  const [permission, setPermission] = useState<NotifPermission>("unsupported")

  // Read current browser permission on mount
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission as NotifPermission)
    }
  }, [])

  /**
   * Request permission from the user, get FCM token, save to Firestore.
   * Call this from a button click — never call automatically on page load.
   */
  const enable = useCallback(async (): Promise<boolean> => {
    if (!user) return false

    const token = await requestAndGetToken()
    if (!token) {
      const p = typeof Notification !== "undefined" ? Notification.permission : "unsupported"
      setPermission(p as NotifPermission)
      return false
    }

    await saveFcmToken(user.uid, token)
    setPermission("granted")
    return true
  }, [user])

  const isSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator

  return { permission, enable, isSupported }
}
