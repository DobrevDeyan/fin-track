"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import {
  collection, query, orderBy, limit,
  onSnapshot, writeBatch, doc,
} from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { db, functions } from "@/lib/firebase"
import { useAuth } from "./AuthContext"
import { logger } from "@/lib/utils/logger"

export interface AppNotification {
  id: string
  title: string
  body: string
  url: string
  read: boolean
  createdAt: { toDate: () => Date } | null
  type: "budget" | "test" | "system"
}

interface NotificationsContextType {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  markAllRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for auth to fully resolve before opening the Firestore subscription.
    // Starting onSnapshot while the auth token is still refreshing causes a
    // transient permission-denied error even though the rules are correct.
    if (authLoading) return
    if (!user) { setLoading(false); return }

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(30)
    )

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification))
      )
      setLoading(false)
    }, (err) => {
      // Swallow transient permission errors during auth token refresh — listener retries automatically
      if (err.code !== "permission-denied") logger.error("Notifications listener error", err)
      setLoading(false)
    })

    return unsub
  }, [user, authLoading])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = useCallback(async () => {
    if (!user) return
    const unread = notifications.filter((n) => !n.read)
    if (unread.length === 0) return
    const batch = writeBatch(db)
    unread.forEach((n) => {
      batch.update(doc(db, "users", user.uid, "notifications", n.id), { read: true })
    })
    await batch.commit()
  }, [user, notifications])

  const deleteNotification = useCallback(async (id: string) => {
    await httpsCallable(functions, "deleteNotification")({ notificationId: id })
  }, [])

  // Goes through the deleteMyNotifications callable rather than a client batch —
  // the shared listener only loads the 30 most recent, so a client-only delete
  // could leave older, undisplayed docs behind and have them reappear later.
  const clearAll = useCallback(async () => {
    await httpsCallable(functions, "deleteMyNotifications")()
  }, [])

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, markAllRead, deleteNotification, clearAll }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useInAppNotifications(): NotificationsContextType {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error("useInAppNotifications must be used within a NotificationsProvider")
  }
  return context
}
