"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useInAppNotifications } from "@/lib/hooks/useInAppNotifications"
import { NotificationPanel } from "./NotificationPanel"

interface Props {
  /** "desktop" = icon button that opens a popover; "mobile" = icon button that calls onOpen */
  variant?: "desktop" | "mobile"
  onOpen?: () => void
  className?: string
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-primary-foreground leading-none">
      {count > 9 ? "9+" : count}
    </span>
  )
}

/** Desktop variant — bell opens a Popover */
function DesktopBell() {
  const { notifications, unreadCount, loading, markAllRead, deleteNotification, clearAll } = useInAppNotifications()
  const [open, setOpen] = useState(false)

  const handleOpen = (v: boolean) => {
    setOpen(v)
    if (v && unreadCount > 0) markAllRead()
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <Badge count={unreadCount} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 max-h-[480px] flex flex-col overflow-hidden"
      >
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          onMarkAllRead={markAllRead}
          onDelete={deleteNotification}
          onClearAll={clearAll}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Mobile variant — just the button; caller controls panel display */
export function MobileBell({ unreadCount, onClick, className }: { unreadCount: number; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn("relative p-1.5 rounded-full hover:bg-muted/80 transition-colors", className)}
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4 text-muted-foreground" />
      <Badge count={unreadCount} />
    </button>
  )
}

export function NotificationBell({ variant = "desktop", onOpen, className }: Props) {
  if (variant === "desktop") return <DesktopBell />

  // Mobile: delegate count to caller via hook at the AppNavbar level
  return null // handled directly in AppNavbar with MobileBell
}
