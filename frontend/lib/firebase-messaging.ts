"use client"

/**
 * Firebase Cloud Messaging — client-side helpers
 *
 * Handles permission requests and FCM token retrieval.
 * Always pass the existing service worker registration so FCM
 * uses our sw.js instead of looking for firebase-messaging-sw.js.
 */

import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging"
import { app } from "./firebase"

let messaging: Messaging | null = null

export function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null
  if (!messaging) {
    try {
      messaging = getMessaging(app)
    } catch {
      return null
    }
  }
  return messaging
}

/**
 * Request notification permission and return the FCM token.
 * Returns null if permission is denied or the browser doesn't support it.
 */
export async function requestAndGetToken(): Promise<string | null> {
  if (typeof window === "undefined") return null
  if (!("Notification" in window)) return null
  if (!("serviceWorker" in navigator)) return null

  const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY
  if (!vapidKey) {
    console.warn("FCM: NEXT_PUBLIC_FCM_VAPID_KEY is not set")
    return null
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  const m = getMessagingInstance()
  if (!m) return null

  try {
    const swReg = await navigator.serviceWorker.ready
    const token = await getToken(m, { vapidKey, serviceWorkerRegistration: swReg })
    return token ?? null
  } catch (err) {
    console.error("FCM: Failed to get token", err)
    return null
  }
}

/**
 * Listen for foreground messages (app is open and in focus).
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(
  handler: (payload: { title?: string; body?: string; url?: string }) => void
): () => void {
  const m = getMessagingInstance()
  if (!m) return () => {}

  return onMessage(m, (payload) => {
    // Data-only messages: all fields live in payload.data
    const d = payload.data ?? {}
    handler({
      title: d.title ?? payload.notification?.title,
      body: d.body ?? payload.notification?.body,
      url: d.url ?? "/dashboard",
    })
  })
}
