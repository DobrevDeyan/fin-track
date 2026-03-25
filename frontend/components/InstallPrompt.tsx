"use client"

import { useEffect, useState } from "react"
import { Zap, CloudOff, Bell, X, Share, MoreHorizontal, PlusSquare } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

function detectIOS() {
  if (typeof navigator === "undefined") return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

function isStandalone() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  )
}

const DISMISSED_KEY = "pocketInstallDismissed"

export const installFeatures = [
  { icon: Zap, label: "Faster loading" },
  { icon: CloudOff, label: "Works offline" },
  { icon: Bell, label: "Push notifications" },
]

export const iosSteps = [
  { num: 1, icon: MoreHorizontal, text: "Tap ··· at the bottom right" },
  { num: 2, icon: Share, text: "Tap Share" },
  { num: 3, icon: PlusSquare, text: "→ 'Add to Home Screen' → 'Add'" },
]

export function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISSED_KEY) === "true") return

    const ios = detectIOS()
    setIsIOS(ios)

    if (ios) {
      const timer = setTimeout(() => setShow(true), 2500)
      return () => clearTimeout(timer)
    } else {
      const onPrompt = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setTimeout(() => setShow(true), 1500)
      }
      const onInstalled = () => setShow(false)

      window.addEventListener("beforeinstallprompt", onPrompt)
      window.addEventListener("appinstalled", onInstalled)

      return () => {
        window.removeEventListener("beforeinstallprompt", onPrompt)
        window.removeEventListener("appinstalled", onInstalled)
      }
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "true")
    }
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    }
    dismiss()
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-50 md:hidden"
            onClick={dismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-3xl overflow-hidden bg-background border-t border-border/50 shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Close button */}
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 pt-3 pb-10">
              {/* Header */}
              <p className="text-muted-foreground text-sm mb-1">Get the full experience</p>
              <h2 className="text-foreground text-2xl font-bold mb-7">Install App</h2>

              {/* Features row */}
              <div className="flex justify-around mb-7">
                {installFeatures.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <Icon className="h-6 w-6 text-emerald-600" strokeWidth={1.5} />
                    </div>
                    <span className="text-foreground/70 text-xs text-center font-medium leading-tight max-w-[72px]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-border mb-6" />

              {isIOS ? (
                <>
                  {/* iOS step-by-step */}
                  <div className="space-y-4 mb-7">
                    {iosSteps.map(({ num, icon: Icon, text }) => (
                      <div key={num} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                          <span className="text-white text-sm font-bold">{num}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                          <span className="text-foreground/80 text-sm">{text}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={dismiss}
                    className="w-full py-4 rounded-2xl bg-foreground text-background font-semibold text-base active:opacity-90 transition-opacity"
                  >
                    Got it
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleInstall}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-semibold text-base mb-3 active:opacity-90 transition-opacity"
                  >
                    Install App
                  </button>
                  <button
                    onClick={dismiss}
                    className="w-full py-3 text-muted-foreground text-sm font-medium"
                  >
                    Maybe later
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
