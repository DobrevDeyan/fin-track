"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MotionConfig } from "framer-motion"
import { ROUTE_FEATURE, FEATURES } from "@/lib/constants/features"
import { AppNavbar } from "@/components/navigation/AppNavbar"
import { BottomNav } from "@/components/navigation/BottomNav"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { SwipeBackNavigator } from "@/components/navigation/SwipeBackNavigator"
import { NotificationListener } from "@/components/NotificationListener"
import { DashboardProvider } from "@/contexts/dashboard/DashboardProvider"
import { GlobalQuickAdd } from "@/components/dashboard/GlobalQuickAdd"
import { InstallPrompt } from "@/components/InstallPrompt"
import { UIComplexityProvider } from "@/contexts/UIComplexityContext"
import { SubscriptionProvider } from "@/contexts/SubscriptionContext"
import { ScanQuotaProvider } from "@/contexts/ScanQuotaContext"
import { NotificationsProvider } from "@/contexts/NotificationsContext"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Guard direct navigation to a disabled feature's route (nav entries are hidden
  // via FEATURES, but the URL is still reachable by hand) — bounce to dashboard.
  useEffect(() => {
    const feature = ROUTE_FEATURE[pathname]
    if (feature && !FEATURES[feature]) {
      router.replace("/dashboard")
    }
  }, [pathname, router])

  return (
    <AuthGuard>
      {/* reducedMotion="always" disables framer-motion's transform/layout animations
          app-wide (the per-card whileHover springs and staggered entrance slides that a
          Performance trace showed running the animation frame loop at ~68% of main-thread
          time and freezing rapid tab switches). Opacity fades still animate — they're
          GPU-composited and cheap. Marketing pages use a separate layout and stay animated. */}
      <MotionConfig reducedMotion="always">
      <UIComplexityProvider>
      <SubscriptionProvider>
      <ScanQuotaProvider>
      <NotificationsProvider>
      <DashboardProvider>
      <NotificationListener />
      <SwipeBackNavigator>
        <AppNavbar />
        {/* pb-24 on mobile gives space above the floating BottomNav pill; none on desktop */}
        {/* No keyed motion wrapper here. `key={pathname}` forced React to tear down and
            rebuild the entire page subtree on every navigation — a Performance trace showed
            react-dom commit work at 65% of main-thread time, remounting the charts/health
            gauge each tap and thrashing layout until the UI froze. Let App Router swap route
            segments and let React reconcile normally; navigation is now cheap. */}
        <div className="pb-24 md:pb-0">
          {children}
        </div>
        <BottomNav />
        <GlobalQuickAdd />
        <InstallPrompt />
      </SwipeBackNavigator>
      </DashboardProvider>
      </NotificationsProvider>
      </ScanQuotaProvider>
      </SubscriptionProvider>
      </UIComplexityProvider>
      </MotionConfig>
    </AuthGuard>
  )
}
