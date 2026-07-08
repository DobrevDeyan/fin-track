"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, TriangleAlert, FlaskConical, CheckCheck, X, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import type { AppNotification } from "@/lib/hooks/useInAppNotifications"

interface Props {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  onMarkAllRead: () => void
  onDelete: (id: string) => Promise<void>
  onClearAll: () => Promise<void>
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
    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 shrink-0">
      <TriangleAlert className="h-4 w-4" />
    </span>
  )
  if (type === "test") return (
    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 shrink-0">
      <FlaskConical className="h-4 w-4" />
    </span>
  )
  return (
    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary shrink-0">
      <Bell className="h-4 w-4" />
    </span>
  )
}

export function NotificationPanel({ notifications, unreadCount, loading, onMarkAllRead, onDelete, onClearAll, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const isOnPage = pathname === "/notifications"
  const tCommon = useTranslations("common")
  const t = useTranslations("notifications")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  const handleClick = (_n: AppNotification) => {
    onClose?.()
    router.push("/notifications")
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      await onDelete(id)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAll = async () => {
    setClearing(true)
    try {
      await onClearAll()
      setClearAllOpen(false)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {!isOnPage && (
            <Link
              href="/notifications"
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1">
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
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={() => setClearAllOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("clearAll")}
            </Button>
          )}
        </div>
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
                <div
                  className={cn(
                    "group relative w-full flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60 cursor-pointer",
                    !n.read && "bg-primary/5"
                  )}
                  onClick={() => handleClick(n)}
                >
                  <TypeIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-snug line-clamp-1", !n.read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                        {n.title}
                      </p>
                      <span
                        className="text-[11px] text-muted-foreground shrink-0 mt-0.5 group-hover:opacity-0 transition-opacity"
                        title={n.createdAt?.toDate().toLocaleString()}
                      >
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0 group-hover:opacity-0 transition-opacity" />
                  )}
                  <button
                    onClick={(e) => handleDelete(e, n.id)}
                    disabled={deletingId === n.id}
                    aria-label={tCommon("delete")}
                    className="absolute right-3 top-2.5 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/50 transition-opacity"
                  >
                    {deletingId === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearAllConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clearAllConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={clearing}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("clearAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
