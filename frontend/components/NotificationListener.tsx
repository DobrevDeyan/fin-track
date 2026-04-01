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

  // Foreground FCM message — behaviour differs by platform:
  //   Mobile  → system notification only (native banner, no duplicate toast)
  //   Desktop → in-app toast only (system banners are intrusive on desktop)
  // Background messages are always handled by the SW regardless of this.
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return
    return onForegroundMessage(({ title, body, url }) => {
      const isMobile =
        (navigator as any).userAgentData?.mobile ??
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

      if (isMobile) {
        // System notification — shows as a native banner and persists in the shade
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title ?? "Pocket", {
              body: body ?? "",
              icon: "/icons/favicon_dark/web-app-manifest-192x192.png",
              badge: "/icons/favicon_dark/favicon-96x96.png",
              tag: "pocket-foreground",
              data: { url: url ?? "/dashboard" },
            })
          })
        }
      } else {
        // In-app toast — less intrusive for desktop users already looking at the screen
        toast(title ?? "Pocket", {
          description: body,
          action: url ? { label: "View", onClick: () => { window.location.href = url } } : undefined,
          duration: 8000,
        })
      }
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
