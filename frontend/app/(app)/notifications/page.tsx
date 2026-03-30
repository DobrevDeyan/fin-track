"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useInAppNotifications } from "@/lib/hooks/useInAppNotifications"
import { NotificationPanel } from "@/components/notifications/NotificationPanel"

export default function NotificationsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { notifications, unreadCount, loading: notifsLoading, markAllRead } = useInAppNotifications()

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login")
  }, [user, loading, router])

  if (loading || !user) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <NotificationPanel
        notifications={notifications}
        unreadCount={unreadCount}
        loading={notifsLoading}
        onMarkAllRead={markAllRead}
      />
    </div>
  )
}
