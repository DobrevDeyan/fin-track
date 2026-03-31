"use client"

import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { AppNavbar } from "@/components/navigation/AppNavbar"
import { BottomNav } from "@/components/navigation/BottomNav"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { SwipeBackNavigator } from "@/components/navigation/SwipeBackNavigator"
import { NotificationListener } from "@/components/NotificationListener"
import { DashboardProvider } from "@/contexts/dashboard/DashboardProvider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AuthGuard>
      <DashboardProvider>
      <NotificationListener />
      <SwipeBackNavigator>
        <AppNavbar />
        {/* pb-24 on mobile gives space above the floating BottomNav pill; none on desktop */}
        <div className="pb-24 md:pb-0">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        <BottomNav />
      </SwipeBackNavigator>
      </DashboardProvider>
    </AuthGuard>
  )
}
