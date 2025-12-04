"use client"

import { useEffect } from "react"

export function RegisterSW() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker for PWA
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js", {
            // Update the service worker immediately when a new one is available
            updateViaCache: "none",
          })
          .then((registration) => {
            console.log("Service Worker registered:", registration)
            
            // Check for updates periodically
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    // New service worker available, reload to activate it
                    console.log("New service worker available, reloading...")
                    window.location.reload()
                  }
                })
              }
            })
            
            // Check for updates every hour
            setInterval(() => {
              registration.update()
            }, 60 * 60 * 1000)
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

  return null
}

