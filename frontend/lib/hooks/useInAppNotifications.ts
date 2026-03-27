"use client"

import { useState, useEffect, useCallback } from "react"
import {
  collection, query, orderBy, limit,
  onSnapshot, writeBatch, doc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/AuthContext"

export interface AppNotification {
  id: string
  title: string
  body: string
  url: string
  read: boolean
  createdAt: { toDate: () => Date } | null
  type: "budget" | "test" | "system"
}

export function useInAppNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    }, () => setLoading(false))

    return unsub
  }, [user])

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

  return { notifications, unreadCount, loading, markAllRead }
}
