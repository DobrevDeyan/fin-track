"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Hero } from "@/components/Hero"
import { useAuth } from "@/contexts/AuthContext"

// Lazy load below-the-fold components for better initial page load
const About = dynamic(() => import("@/components/About").then(mod => ({ default: mod.About })), {
  loading: () => <div className="min-h-[400px]" />,
});
const HowItWorks = dynamic(() => import("@/components/HowItWorks").then(mod => ({ default: mod.HowItWorks })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Features = dynamic(() => import("@/components/Features").then(mod => ({ default: mod.Features })), {
  loading: () => <div className="min-h-[400px]" />,
});
const InstallGuide = dynamic(() => import("@/components/InstallGuide").then(mod => ({ default: mod.InstallGuide })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Services = dynamic(() => import("@/components/Services").then(mod => ({ default: mod.Services })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Cta = dynamic(() => import("@/components/Cta").then(mod => ({ default: mod.Cta })), {
  loading: () => <div className="min-h-[400px]" />,
});
// const Testimonials = dynamic(() => import("@/components/Testimonials").then(mod => ({ default: mod.Testimonials })), {
//   loading: () => <div className="min-h-[400px]" />,
// });
const Pricing = dynamic(() => import("@/components/Pricing").then(mod => ({ default: mod.Pricing })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Newsletter = dynamic(() => import("@/components/Newsletter").then(mod => ({ default: mod.Newsletter })), {
  loading: () => <div className="min-h-[400px]" />,
});
const FAQ = dynamic(() => import("@/components/FAQ").then(mod => ({ default: mod.FAQ })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Footer = dynamic(() => import("@/components/Footer").then(mod => ({ default: mod.Footer })), {
  loading: () => <div className="min-h-[200px]" />,
});
const ScrollToTop = dynamic(() => import("@/components/ScrollToTop").then(mod => ({ default: mod.ScrollToTop })));

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)
  const [showLanding, setShowLanding] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Check landing param and set initial redirecting state
  useEffect(() => {
    if (typeof window === "undefined") return

    setMounted(true)
    const params = new URLSearchParams(window.location.search)

    // Allow authenticated users to view landing page via /?landing
    if (params.has("landing")) {
      setShowLanding(true)
      return
    }

    // If user already exists on mount, mark as redirecting immediately
    // This prevents flash of landing page content
    if (user) {
      setRedirecting(true)
    }
  }, []) // Empty deps - only run once on mount

  // Handle redirect when user state changes
  useEffect(() => {
    if (typeof window === "undefined") return
    // Check URL directly — don't rely on showLanding state which may be stale in this closure
    if (new URLSearchParams(window.location.search).has("landing")) return

    // Redirect authenticated users to dashboard using Next.js router
    if (!loading && user && !redirecting) {
      setRedirecting(true)
      router.push("/dashboard")
    }
  }, [user, loading, router, redirecting])

  // After the landing page becomes visible, scroll to the hash anchor.
  // Native hash scroll fires too early (before the loading spinner is removed
  // and before dynamic components mount), so we handle it manually.
  useEffect(() => {
    if (!showLanding) return
    const hash = window.location.hash
    if (!hash) return
    const scrollToHash = () => {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: "smooth" })
      }
    }
    // Give dynamic imports time to mount
    const t = setTimeout(scrollToHash, 600)
    return () => clearTimeout(t)
  }, [showLanding])

  // While checking auth or redirecting, show a minimal loading screen
  // This prevents the landing page from flashing before redirect.
  // We check multiple conditions to ensure no flash:
  // 1. !mounted - Component hasn't mounted yet
  // 2. loading - Auth is still loading
  // 3. redirecting - We're in the process of redirecting
  // 4. !!user - User exists (even if redirect hasn't started yet)
  // 5. !showLanding - Landing param not present
  if (!mounted || !showLanding && (loading || redirecting || !!user)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  // Show the marketing landing page
  return (
    <>
      <Hero />
      {/* <Sponsors /> */}
      <About />
      <HowItWorks />
      <InstallGuide />
      <Features />
      <Services />
      <Cta />
      {/* <Testimonials /> */}
      {/* <Team /> */}
      <Pricing />
      <Newsletter />
      <FAQ />
      <Footer />
      <ScrollToTop />
    </>
  );
}
