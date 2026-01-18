"use client"

import { useEffect, useState } from "react"
import { initVersionTracking, APP_VERSION } from "@/lib/app-version"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

let updateAvailable = false
let waitingWorker: ServiceWorker | null = null

export function RegisterSW() {
  const [updatePending, setUpdatePending] = useState(false)
  
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Check for version change on app load
      const hasVersionUpdate = initVersionTracking()
      
      // Register service worker for PWA
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js", {
            // Update the service worker immediately when a new one is available
            updateViaCache: "none",
          })
          .then((registration) => {
            console.log("Service Worker registered:", registration)
            
            // Check if there's a waiting service worker
            if (registration.waiting) {
              waitingWorker = registration.waiting
              updateAvailable = true
              showUpdateNotification(registration.waiting)
            }
            
            // Listen for updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed") {
                    if (navigator.serviceWorker.controller) {
                      // New service worker available
                      waitingWorker = newWorker
                      updateAvailable = true
                      showUpdateNotification(newWorker)
                    } else {
                      // First install, just log
                      console.log("Service Worker installed for the first time")
                    }
                  }
                })
              }
            })
            
            // Handle controller change (service worker has been updated)
            navigator.serviceWorker.addEventListener("controllerchange", () => {
              if (hasVersionUpdate) {
                // Version changed, reload to get new version
                toast.info("App updated! Reloading...", {
                  duration: 2000,
                })
                setTimeout(() => {
                  window.location.reload()
                }, 1000)
              }
            })
            
            // Force immediate update check on registration
            registration.update()
            
            // Check for updates periodically (every 10 minutes)
            setInterval(() => {
              registration.update()
            }, 10 * 60 * 1000)
            
            // Also check for updates when page becomes visible (user returns to tab)
            document.addEventListener("visibilitychange", () => {
              if (!document.hidden) {
                registration.update()
              }
            })
          })
          .catch((error) => {
            console.log("Service Worker registration failed:", error)
          })
        
        // Unregister any old service workers that might be causing issues
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            if (registration.scope.includes("/sw.js") && !registration.active) {
              registration.unregister().then(() => {
                console.log("Unregistered old service worker")
              })
            }
          })
        })
      }
    }
  }, [])

  const showUpdateNotification = (worker: ServiceWorker) => {
    if (updatePending) return // Don't show multiple notifications
    
    setUpdatePending(true)
    
    toast.info(
      <div className="flex flex-col gap-2">
        <p className="font-semibold">New version available!</p>
        <p className="text-sm text-muted-foreground">
          A new version of the app is ready. Click to update now.
        </p>
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            onClick={() => {
              // Skip waiting and reload
              if (worker) {
                worker.postMessage({ type: "SKIP_WAITING" })
              }
              window.location.reload()
              setUpdatePending(false)
            }}
          >
            Update Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setUpdatePending(false)
              toast.dismiss()
            }}
          >
            Later
          </Button>
        </div>
      </div>,
      {
        duration: Infinity, // Don't auto-dismiss
        id: "app-update", // Unique ID to prevent duplicates
      }
    )
  }

  return null
}
