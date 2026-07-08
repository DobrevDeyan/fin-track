"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useInAppNotifications } from "@/lib/hooks/useInAppNotifications"
import { Bell, TriangleAlert, FlaskConical, CheckCheck, ArrowLeft, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import type { AppNotification } from "@/lib/hooks/useInAppNotifications"

function TypeIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "budget") return (
    <span className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 shrink-0">
      <TriangleAlert className="h-5 w-5" />
    </span>
  )
  if (type === "test") return (
    <span className="flex items-center justify-center h-10 w-10 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 shrink-0">
      <FlaskConical className="h-5 w-5" />
    </span>
  )
  return (
    <span className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary shrink-0">
      <Bell className="h-5 w-5" />
    </span>
  )
}

const BORDER_BY_TYPE: Record<AppNotification["type"], string> = {
  budget: "border-l-amber-500",
  test: "border-l-purple-500",
  system: "border-l-primary",
}

function groupByRecency(notifications: AppNotification[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000)

  const today: AppNotification[] = []
  const thisWeek: AppNotification[] = []
  const earlier: AppNotification[] = []

  for (const n of notifications) {
    const date = n.createdAt?.toDate()
    if (!date) { earlier.push(n); continue }
    if (date >= startOfToday) today.push(n)
    else if (date >= startOfWeek) thisWeek.push(n)
    else earlier.push(n)
  }
  return { today, thisWeek, earlier }
}

export default function NotificationsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const t = useTranslations("notifications")
  const tCommon = useTranslations("common")
  const { notifications, unreadCount, loading: notifsLoading, markAllRead, deleteNotification, clearAll } = useInAppNotifications()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  function relativeTime(ts: AppNotification["createdAt"]): string {
    if (!ts) return ""
    const diff = Math.floor((Date.now() - ts.toDate().getTime()) / 1000)
    if (diff < 60) return t("justNow")
    if (diff < 3600) return t("minutesAgo", { count: Math.floor(diff / 60) })
    if (diff < 86400) return t("hoursAgo", { count: Math.floor(diff / 3600) })
    return t("daysAgo", { count: Math.floor(diff / 86400) })
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login")
  }, [user, loading, router])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteNotification(id)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAll = async () => {
    setClearing(true)
    try {
      await clearAll()
      setClearAllOpen(false)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setClearing(false)
    }
  }

  if (loading || !user) return null

  const { today, thisWeek, earlier } = groupByRecency(notifications)
  const groups: [string, AppNotification[]][] = [
    [t("today"), today],
    [t("thisWeek"), thisWeek],
    [t("earlier"), earlier],
  ]

  const renderCard = (n: AppNotification) => (
    <div
      key={n.id}
      className={cn(
        "group flex items-start gap-3 p-4 rounded-xl border border-l-2 transition-colors",
        BORDER_BY_TYPE[n.type],
        n.read
          ? "bg-card border-border/50"
          : "bg-primary/5 border-primary/20"
      )}
    >
      <TypeIcon type={n.type} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm leading-snug",
            n.read ? "font-medium text-foreground/80" : "font-semibold text-foreground"
          )}>
            {n.title}
          </p>
          <span
            className="text-[11px] text-muted-foreground shrink-0 mt-0.5 tabular-nums"
            title={n.createdAt?.toDate().toLocaleString()}
          >
            {relativeTime(n.createdAt)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {n.body}
        </p>
      </div>
      {!n.read && (
        <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/50"
        onClick={() => handleDelete(n.id)}
        disabled={deletingId === n.id}
        aria-label={tCommon("delete")}
      >
        {deletingId === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )

  return (
    <div className="container py-6 px-4 sm:px-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground leading-tight">{t("title")}</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground">{t("unreadCount", { count: unreadCount })}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={markAllRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {t("markAllRead")}
          </Button>
        )}
        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 text-muted-foreground"
            onClick={() => setClearAllOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("clearAll")}
          </Button>
        )}
      </div>

      {/* List */}
      {notifsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-card">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-muted">
            <Bell className="h-8 w-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">{t("caughtUp")}</p>
          <p className="text-xs text-muted-foreground/70">{t("noNotificationsYet")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([label, items]) => items.length === 0 ? null : (
            <div key={label} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                {label}
              </h2>
              <div className="space-y-2">
                {items.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      )}

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
