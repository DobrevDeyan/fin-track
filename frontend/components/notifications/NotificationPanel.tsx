"use client"

import { useRouter } from "next/navigation"
import { Bell, TriangleAlert, FlaskConical, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AppNotification } from "@/lib/hooks/useInAppNotifications"

interface Props {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  onMarkAllRead: () => void
  onClose?: () => void
}

function relativeTime(ts: AppNotification["createdAt"]): string {
  if (!ts) return ""
  const diff = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function TypeIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "budget") return (
    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 text-amber-600 shrink-0">
      <TriangleAlert className="h-4 w-4" />
    </span>
  )
  if (type === "test") return (
    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-600 shrink-0">
      <FlaskConical className="h-4 w-4" />
    </span>
  )
  return (
    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary shrink-0">
      <Bell className="h-4 w-4" />
    </span>
  )
}

export function NotificationPanel({ notifications, unreadCount, loading, onMarkAllRead, onClose }: Props) {
  const router = useRouter()

  const handleClick = (n: AppNotification) => {
    onClose?.()
    const path = n.url.startsWith("http") ? new URL(n.url).pathname : n.url
    router.push(path)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <span className="text-sm font-semibold text-foreground">Notifications</span>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={onMarkAllRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <span className="text-sm">No notifications yet</span>
          </div>
        ) : (
          <ul>
            {notifications.map((n, i) => (
              <li key={n.id}>
                {i > 0 && <div className="h-px bg-border/40 mx-4" />}
                <button
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <TypeIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-snug line-clamp-1", !n.read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                        {n.title}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
