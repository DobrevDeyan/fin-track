"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, FileText, Settings, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/calendar", icon: Calendar, labelKey: "calendar" },
  { href: "/reports", icon: FileText, labelKey: "reports" },
  { href: "/settings", icon: Settings, labelKey: "settings" },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations("nav")

  const openQuickAdd = () => {
    window.dispatchEvent(new CustomEvent("pocket:openQuickAdd"))
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex justify-center px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <div className="flex items-center bg-background/95 backdrop-blur-md border border-border/60 shadow-xl shadow-black/10 rounded-2xl px-1 py-1.5 gap-0">
        {tabs.map(({ href, icon: Icon, labelKey }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 min-w-0",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={cn("text-[10px] font-medium truncate", isActive && "font-semibold")}>
                {t(labelKey)}
              </span>
            </Link>
          )
        })}

        {/* Divider */}
        <div className="w-px h-6 bg-border/50 mx-1 shrink-0" />

        {/* Quick add button */}
        <button
          onClick={openQuickAdd}
          className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 bg-primary/10 text-primary hover:bg-primary/20 min-w-0"
          aria-label="Add transaction"
        >
          <Plus className="h-5 w-5 shrink-0" strokeWidth={2} />
          <span className="text-[10px] font-semibold truncate">Add</span>
        </button>
      </div>
    </nav>
  )
}
