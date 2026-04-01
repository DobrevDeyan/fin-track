"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, BellOff, X } from "lucide-react"
import {
  requestNotificationPermission,
  canSendNotifications,
  scheduleSalaryReminder,
  shouldRemindAboutSalary,
} from "@/lib/notification-service"

interface Entry {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
  notes?: string
}

interface SalaryReminderNotificationProps {
  entries: Entry[]
}

/**
 * Component to handle salary reminder notifications
 * Requests permission and schedules monthly reminders
 */
export function SalaryReminderNotification({ entries }: SalaryReminderNotificationProps) {
  const [hasPermission, setHasPermission] = useState(false)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    // Check current permission status
    if ("Notification" in window) {
      setHasPermission(canSendNotifications())
      setPermissionDenied(Notification.permission === "denied")
      
      // Show prompt if permission not yet requested
      if (Notification.permission === "default") {
        setShowPermissionPrompt(true)
      }
    }
  }, [])

  const entriesRef = useRef(entries)
  entriesRef.current = entries

  useEffect(() => {
    if (!hasPermission) return
    const cleanup = scheduleSalaryReminder(() => shouldRemindAboutSalary(entriesRef.current))
    return cleanup
  }, [hasPermission])

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission()
    setHasPermission(granted)
    setShowPermissionPrompt(false)
    
    if (granted) {
      // Effect will pick this up via hasPermission state change
    } else {
      setPermissionDenied(true)
    }
  }

  const handleDismiss = () => {
    setShowPermissionPrompt(false)
    // Store in localStorage to not show again
    if (typeof window !== "undefined") {
      localStorage.setItem("notificationPromptDismissed", "true")
    }
  }

  // Don't show if already dismissed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("notificationPromptDismissed") === "true"
      if (dismissed) {
        setShowPermissionPrompt(false)
      }
    }
  }, [])

  // Don't show if permission already granted or denied
  if (hasPermission || permissionDenied || !showPermissionPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Enable Salary Reminders</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-sm mt-2">
            Get notified on the 1st of each month to enter your salary. Never miss tracking your income!
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              onClick={handleRequestPermission}
              size="sm"
              className="flex-1"
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
            >
              <BellOff className="h-4 w-4 mr-2" />
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

