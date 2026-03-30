"use client"

/**
 * Mounts the FCM foreground message listener and SW notification-click handler
 * globally so they are active on every page, not just Settings.
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { requestAndGetToken, onForegroundMessage } from "@/lib/firebase-messaging"
import { saveFcmToken } from "@/lib/firestore-users"

export function NotificationListener() {
  const { user } = useAuth()
  const router = useRouter()

  // Silently refresh/save FCM token if permission already granted
  useEffect(() => {
    if (!user || typeof Notification === "undefined" || Notification.permission !== "granted") return
    requestAndGetToken().then((token) => {
      if (token) saveFcmToken(user.uid, token).catch(() => {})
    })
  }, [user])

  // Foreground FCM message → toast
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return
    return onForegroundMessage(({ title, body, url }) => {
      toast(title ?? "Pocket", {
        description: body,
        action: url ? { label: "View", onClick: () => { window.location.href = url } } : undefined,
        duration: 6000,
      })
    })
  }, [])

  // SW postMessage on notification tap (iOS-safe navigate)
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "NOTIFICATION_CLICK") return
      const url: string = event.data.url ?? "/notifications"
      const path = url.startsWith("http") ? new URL(url).pathname : url
      router.push(path)
    }
    navigator.serviceWorker.addEventListener("message", handler)
    return () => navigator.serviceWorker.removeEventListener("message", handler)
  }, [router])

  return null
}
