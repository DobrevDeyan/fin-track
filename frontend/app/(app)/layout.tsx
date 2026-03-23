"use client"

import { AppNavbar } from "@/components/navigation/AppNavbar"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { SwipeBackNavigator } from "@/components/navigation/SwipeBackNavigator"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SwipeBackNavigator>
        <AppNavbar />
        {children}
      </SwipeBackNavigator>
    </AuthGuard>
  )
}
