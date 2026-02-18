"use client"

import { AppNavbar } from "@/components/navigation/AppNavbar"
import { AuthGuard } from "@/components/auth/AuthGuard"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppNavbar />
      {children}
    </AuthGuard>
  )
}
