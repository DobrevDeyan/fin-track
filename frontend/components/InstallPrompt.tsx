"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

/**
 * Custom Install Prompt Component
 * 
 * This component handles the PWA install prompt, allowing users to install
 * the app with a custom UI instead of relying on the browser's default prompt.
 * 
 * Key points:
 * - Listens for 'beforeinstallprompt' event
 * - Stores the event to prevent default browser prompt
 * - Shows custom install button when app is installable
 * - Triggers install prompt when user clicks button
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault()
      
      // Store the event so we can trigger it later
      setDeferredPrompt(e)
      
      // Show our custom install button
      setShowInstallButton(true)
    }

    // Listen for when the app is successfully installed
    const handleAppInstalled = () => {
      console.log("PWA was installed")
      setIsInstalled(true)
      setShowInstallButton(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      console.log("User accepted the install prompt")
    } else {
      console.log("User dismissed the install prompt")
    }

    // Clear the deferred prompt
    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  const [wasDismissed, setWasDismissed] = useState(false)

  useEffect(() => {
    // Check if user previously dismissed (client-side only)
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("installPromptDismissed") === "true"
      setWasDismissed(dismissed)
    }
  }, [])

  const handleDismiss = () => {
    setShowInstallButton(false)
    // Store in localStorage to not show again
    if (typeof window !== "undefined") {
      localStorage.setItem("installPromptDismissed", "true")
      setWasDismissed(true)
    }
  }

  // Don't show if already installed, not installable, or if user dismissed it
  if (isInstalled || !showInstallButton || wasDismissed) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-background border rounded-lg shadow-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Install FinTrack</h3>
            <p className="text-xs text-muted-foreground">
              Install our app for a better experience. Quick access, offline support, and more!
            </p>
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
        <div className="flex gap-2">
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}

