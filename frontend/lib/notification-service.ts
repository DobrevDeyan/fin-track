/**
 * Browser Notification Service
 * Handles salary reminders and other notifications
 */

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications")
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission === "granted"
  }

  return false
}

/**
 * Check if notifications are supported and permitted
 */
export function canSendNotifications(): boolean {
  return (
    "Notification" in window &&
    Notification.permission === "granted"
  )
}

/**
 * Send a browser notification
 */
export function sendNotification(options: NotificationOptions): Notification | null {
  if (!canSendNotifications()) {
    console.warn("Notifications not permitted")
    return null
  }

  const notificationOptions: NotificationOptions = {
    icon: options.icon || "/icons/icon-192x192.png",
    badge: options.badge || "/icons/icon-96x96.png",
    tag: options.tag || "default",
    requireInteraction: options.requireInteraction || false,
    ...options,
  }

  try {
    const notification = new Notification(options.title, notificationOptions)
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)

    // Handle click - focus the app
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return notification
  } catch (error) {
    console.error("Error sending notification:", error)
    return null
  }
}

/**
 * Send salary reminder notification
 */
export function sendSalaryReminder(monthName: string): void {
  sendNotification({
    title: "💼 Salary Reminder",
    body: `Don't forget to enter your ${monthName} salary to track your monthly budget!`,
    tag: "salary-reminder",
    requireInteraction: false,
  })
}

/**
 * Schedule monthly salary reminder
 * This checks daily and sends notification on the 1st of each month
 */
export function scheduleSalaryReminder(
  checkCallback: () => { shouldNotify: boolean; monthName: string }
): void {
  // Check once per day
  const checkInterval = 24 * 60 * 60 * 1000 // 24 hours

  const checkAndNotify = () => {
    if (!canSendNotifications()) {
      return
    }

    const { shouldNotify, monthName } = checkCallback()
    
    if (shouldNotify) {
      sendSalaryReminder(monthName)
    }
  }

  // Check immediately
  checkAndNotify()

  // Then check daily
  setInterval(checkAndNotify, checkInterval)
}

/**
 * Check if today is a good day to remind about salary
 * Reminds on 1st-3rd of each month
 */
export function shouldRemindAboutSalary(entries: Array<{ date: string; type: string; category: string }>): {
  shouldNotify: boolean
  monthName: string
} {
  const today = new Date()
  const currentDay = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  // Only remind on 1st, 2nd, or 3rd of the month
  if (currentDay < 1 || currentDay > 3) {
    return { shouldNotify: false, monthName: "" }
  }

  // Check if user has a salary entry for current month
  const hasSalaryEntry = entries.some((entry) => {
    if (entry.type !== "income" || entry.category.toLowerCase() !== "salary") {
      return false
    }

    const entryDate = new Date(entry.date)
    return (
      entryDate.getMonth() === currentMonth &&
      entryDate.getFullYear() === currentYear
    )
  })

  const monthName = today.toLocaleString("en-US", { month: "long" })

  return {
    shouldNotify: !hasSalaryEntry,
    monthName,
  }
}

