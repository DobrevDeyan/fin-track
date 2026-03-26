"use client"

/**
 * useNotifications hook
 *
 * - Reads current notification permission state
 * - Exposes `enable()` to request permission, get an FCM token, and save it
 * - Subscribes to foreground messages and shows a toast
 */

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { requestAndGetToken, onForegroundMessage } from "@/lib/firebase-messaging"
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

  // If already granted, silently refresh/save token
  useEffect(() => {
    if (!user || permission !== "granted") return

    requestAndGetToken().then((token) => {
      if (token) saveFcmToken(user.uid, token).catch(() => {})
    })
  }, [user, permission])

  // Foreground message → toast notification
  useEffect(() => {
    if (permission !== "granted") return

    const unsub = onForegroundMessage(({ title, body, url }) => {
      toast(title ?? "Pocket", {
        description: body,
        action: url
          ? { label: "View", onClick: () => window.location.href = url }
          : undefined,
        duration: 6000,
      })
    })

    return unsub
  }, [permission])

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
