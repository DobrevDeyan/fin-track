"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Menu, LogOut, X, Globe, Info, LayoutDashboard,
  Calendar as CalendarIcon, FileText, Settings, Receipt,
  Landmark, ChevronDown, DollarSign, Sparkles, ChevronRight, MessageSquare,
  ChevronLeft, Trophy,
} from "lucide-react"
import { useInAppNotifications } from "@/lib/hooks/useInAppNotifications"
import { MobileBell, NotificationBell } from "@/components/notifications/NotificationBell"
import { NotificationPanel } from "@/components/notifications/NotificationPanel"
import Image from "next/image"
import { PocketLogo } from "@/components/PocketLogo"
import { useAuth } from "@/contexts/AuthContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { updateUserCurrency } from "@/lib/firestore-users"
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/constants/currency.constants"
import { useCurrency } from "@/contexts/CurrencyContext"
import { useLanguage } from "@/contexts/LanguageContext"
// import { locales, localeNames, type Locale } from "@/i18n/config" // disabled
import { ERROR_MESSAGES } from "@/lib/constants/validation.constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { ThemeControls } from "@/components/ThemeControls"

export const AppNavbar = () => {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const { user, logout } = useAuth()
  const { userCurrency, refreshCurrency, displayName } = useCurrency()
  // const { locale, setLocale } = useLanguage() // disabled

  const appRoutes = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/calendar", label: t("calendar"), icon: CalendarIcon },
    { href: "/reports", label: t("reports"), icon: FileText },
    { href: "/receipts", label: t("receipts"), icon: Receipt },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    // { href: "/net-worth", label: t("netWorth"), icon: Landmark }, // disabled
  ]

  const handleCurrencyChange = async (currency: SupportedCurrency) => {
    if (!user || currencyLoading) return
    try {
      setCurrencyLoading(true)
      await updateUserCurrency(user.uid, currency)
      await refreshCurrency()
      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (error) {
      console.error("Error updating currency:", error)
      toast.error(ERROR_MESSAGES.CURRENCY_UPDATE_FAILED)
    } finally {
      setCurrencyLoading(false)
    }
  }

  // Language change disabled
  // const handleLanguageChange = async (newLocale: string) => {
  //   const loc = newLocale as Locale
  //   setLocale(loc)
  //   if (user) {
  //     try {
  //       await updateUserLanguage(user.uid, loc)
  //     } catch (error) {
  //       console.error("Error saving language:", error)
  //     }
  //   }
  // }

  const handleLogout = async () => {
    try {
      setIsOpen(false)
      await logout()
    } catch (error) {
      console.error("Failed to logout:", error)
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login"
      }
    }
  }

  const getUserInitials = (user: any) => {
    if (user?.displayName) {
      const names = user.displayName.split(" ")
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase()
      }
      return names[0][0].toUpperCase()
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return "U"
  }

  const [showFloatingMenu, setShowFloatingMenu] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const { notifications, unreadCount, loading: notifsLoading, markAllRead } = useInAppNotifications()

  const handleOpenNotifs = () => {
    setShowNotifs(true)
    if (unreadCount > 0) markAllRead()
  }

  // Lock body scroll when sheet is open
  useEffect(() => {
    const html = document.documentElement
    if (isOpen) {
      html.style.overflow = "hidden"
      document.body.style.overflow = "hidden"
    } else {
      html.style.overflow = ""
      document.body.style.overflow = ""
    }
    return () => {
      html.style.overflow = ""
      document.body.style.overflow = ""
    }
  }, [isOpen])

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (deltaX > 60 && deltaY < deltaX) {
      setIsOpen(false)
    }
  }

  // Swipe left from right edge to open menu
  useEffect(() => {
    const EDGE_THRESHOLD = 40 // px from right edge to start gesture
    const SWIPE_MIN = 60      // minimum horizontal distance to trigger
    let startX = 0
    let startY = 0
    let fromEdge = false

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      fromEdge = startX >= window.innerWidth - EDGE_THRESHOLD
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!fromEdge) return
      const deltaX = e.changedTouches[0].clientX - startX
      const deltaY = Math.abs(e.changedTouches[0].clientY - startY)
      if (deltaX < -SWIPE_MIN && deltaY < Math.abs(deltaX)) {
        setIsOpen(true)
      }
      fromEdge = false
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingMenu(window.scrollY > 100)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: 16 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.22, ease: "easeOut" },
    }),
  }

  return (
    <>
      {/* Floating side tab - mobile only */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed top-1/2 right-0 z-50 md:hidden"
        initial={{ x: 14, opacity: 0 }}
        animate={showFloatingMenu ? { x: 0, opacity: 1 } : { x: 14, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          pointerEvents: showFloatingMenu ? "auto" : "none",
          translateY: "-50%",
          padding: "28px 0 28px 14px",
        }}
        whileTap={{ x: -6 }}
        aria-label="Open menu"
      >
        <svg
          width="14" height="72" viewBox="0 0 14 72" fill="none"
          className="text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
        >
          {/* Trapezoid body */}
          <path d="M0 9 L14 0 L14 72 L0 63 Z" fill="currentColor" fillOpacity="0.65" />
          {/* Top end cap */}
          <line x1="0" y1="9" x2="14" y2="0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {/* Bottom end cap */}
          <line x1="0" y1="63" x2="14" y2="72" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </motion.button>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) setShowNotifs(false) }}>
        <SheetContent
          side="right"
          className="w-[300px] sm:w-[340px] [&>button]:hidden p-0 flex flex-col border-l-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

          {/* Header */}
          <div className="px-5 pt-6 pb-5">
            <div className="flex items-center justify-between mb-5">
              {showNotifs ? (
                <button
                  onClick={() => setShowNotifs(false)}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <span className="font-bold text-lg text-foreground tracking-tight">Pocket</span>
              )}
              <div className="flex items-center gap-1">
                {!showNotifs && (
                  <MobileBell unreadCount={unreadCount} onClick={handleOpenNotifs} />
                )}
                <button
                  onClick={() => { setIsOpen(false); setShowNotifs(false) }}
                  className="rounded-full p-1.5 bg-muted hover:bg-muted/80 transition-colors focus:outline-none"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-emerald-400/30">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-700 font-semibold text-base">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-foreground font-semibold text-sm truncate leading-tight">
                  {displayName || user?.displayName || "User"}
                </span>
                <span className="text-muted-foreground text-xs truncate mt-0.5">
                  {user?.email}
                </span>
              </div>
            </div>

            {/* Currency + Language pills */}
            <div className="flex gap-2 mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-foreground text-xs font-medium">
                    <DollarSign className="h-3 w-3 text-emerald-600" />
                    {userCurrency}
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-36" align="start">
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <DropdownMenuItem
                      key={currency}
                      onClick={() => handleCurrencyChange(currency as SupportedCurrency)}
                      className={cn("text-sm", userCurrency === currency && "font-semibold text-primary")}
                    >
                      {currency}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Language picker disabled
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-foreground text-xs font-medium">
                    <Globe className="h-3 w-3 text-emerald-600" />
                    {localeNames[locale as Locale] ?? locale.toUpperCase()}
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-36" align="start">
                  {locales.map((loc) => (
                    <DropdownMenuItem
                      key={loc}
                      onClick={() => handleLanguageChange(loc)}
                      className={cn("text-sm", locale === loc && "font-semibold text-primary")}
                    >
                      {localeNames[loc]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              */}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/50 mx-0" />

          {/* Notification panel view */}
          {showNotifs && (
            <div className="flex-1 overflow-hidden bg-muted/40">
              <NotificationPanel
                notifications={notifications}
                unreadCount={unreadCount}
                loading={notifsLoading}
                onMarkAllRead={markAllRead}
                onClose={() => { setIsOpen(false); setShowNotifs(false) }}
              />
            </div>
          )}

          {/* Nav content */}
          <nav className={`flex flex-col flex-1 px-4 py-5 overflow-y-auto gap-5 bg-muted/40 ${showNotifs ? "hidden" : ""}`}>

            {/* Navigate */}
            <motion.div
              custom={0}
              initial="hidden"
              animate={isOpen ? "visible" : "hidden"}
              variants={itemVariants}
            >
              <p className="text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-widest mb-2 px-1">
                Navigate
              </p>
              <div className="rounded-2xl overflow-hidden bg-muted/50">
                {appRoutes.map(({ href, label, icon: Icon }, i) => {
                  const isActive = pathname === href
                  return (
                    <div key={href}>
                      {i > 0 && <div className="h-px bg-border/60 mx-4" />}
                      <Link
                        href={href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium transition-colors duration-150",
                          isActive ? "text-emerald-700" : "text-foreground/65 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center h-8 w-8 rounded-lg shrink-0 transition-colors",
                          isActive
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-background text-muted-foreground"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="flex-1">{label}</span>
                        <ChevronRight className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-emerald-600/40" : "text-muted-foreground/30"
                        )} />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Tools */}
            <motion.div
              custom={1}
              initial="hidden"
              animate={isOpen ? "visible" : "hidden"}
              variants={itemVariants}
            >
              <p className="text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-widest mb-2 px-1">
                Tools
              </p>
              <div className="rounded-2xl overflow-hidden bg-muted/50">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    window.dispatchEvent(new Event("pocket:openAIChat"))
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium text-foreground/65 hover:text-foreground transition-colors duration-150"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-100 text-purple-600 shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left">AI Budget Coach</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                </button>
                <div className="h-px bg-border/60 mx-4" />
                <a
                  href={process.env.NEXT_PUBLIC_FEEDBACK_URL ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium text-foreground/65 hover:text-foreground transition-colors duration-150"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="flex-1">Send Feedback</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                </a>
              </div>
            </motion.div>

            {/* Account */}
            <motion.div
              custom={2}
              initial="hidden"
              animate={isOpen ? "visible" : "hidden"}
              variants={itemVariants}
            >
              <p className="text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-widest mb-2 px-1">
                Account
              </p>
              <div className="rounded-2xl overflow-hidden bg-muted/50">
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium transition-colors duration-150",
                    pathname === "/settings" ? "text-emerald-700" : "text-foreground/65 hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-lg shrink-0 transition-colors",
                    pathname === "/settings"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-background text-muted-foreground"
                  )}>
                    <Settings className="h-4 w-4" />
                  </div>
                  <span className="flex-1">{t("accountSettings")}</span>
                  <ChevronRight className={cn(
                    "h-4 w-4 shrink-0",
                    pathname === "/settings" ? "text-emerald-600/40" : "text-muted-foreground/30"
                  )} />
                </Link>
                <div className="h-px bg-border/60 mx-4" />
                <Link
                  href="/?landing"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium text-foreground/65 hover:text-foreground transition-colors duration-150"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-background text-muted-foreground shrink-0">
                    <Info className="h-4 w-4" />
                  </div>
                  <span className="flex-1">About Pocket</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                </Link>
              </div>
            </motion.div>

            {/* Preferences */}
            <motion.div
              custom={3}
              initial="hidden"
              animate={isOpen ? "visible" : "hidden"}
              variants={itemVariants}
            >
              <p className="text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-widest mb-3 px-1">
                Preferences
              </p>
              <div className="rounded-2xl bg-muted/50 px-4 py-3">
                <ThemeControls compact />
              </div>
            </motion.div>

            {/* Logout */}
            <motion.div
              custom={4}
              initial="hidden"
              animate={isOpen ? "visible" : "hidden"}
              variants={itemVariants}
              className="mt-auto"
            >
              <div className="rounded-2xl overflow-hidden bg-muted/50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium text-red-600 hover:text-red-700 transition-colors duration-150"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50 text-red-500 shrink-0">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left">{t("logout")}</span>
                </button>
              </div>
            </motion.div>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop header */}
      <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container h-14 flex items-center justify-between">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg tracking-tight shrink-0">
            <PocketLogo width={28} height={28} className="w-6 h-6" priority />
            <span className="text-foreground">Pocket</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            className="flex md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={(e) => { (e.currentTarget as HTMLButtonElement).blur(); setIsOpen(true) }}
            aria-label={t("menu")}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop nav — icon pills with tooltips */}
          <TooltipProvider delayDuration={400}>
            <nav className="hidden md:flex items-center gap-1 bg-muted rounded-xl p-1">
              {appRoutes.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href
                return (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={href}
                        className={cn(
                          "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/70"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-emerald-600")} />
                        <span className="hidden lg:inline">{label}</span>
                        {isActive && (
                          <motion.div
                            layoutId="desktopActiveBar"
                            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-emerald-500"
                          />
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="lg:hidden">
                      {label}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </nav>
          </TooltipProvider>

          {/* Desktop right — consolidated currency/language + avatar */}
          <div className="hidden md:flex items-center gap-2">
            <NotificationBell variant="desktop" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 border border-transparent hover:border-border/50">
                  <span className="text-xs font-semibold">{userCurrency}</span>
                  {/* Language indicator disabled */}
                  <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="end">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">Currency</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={userCurrency} onValueChange={(v) => handleCurrencyChange(v as SupportedCurrency)}>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <DropdownMenuRadioItem key={currency} value={currency} className="text-sm">
                      {currency}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {/* Language section disabled
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">Language</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={locale} onValueChange={handleLanguageChange}>
                  {locales.map((loc) => (
                    <DropdownMenuRadioItem key={loc} value={loc} className="text-sm">
                      {localeNames[loc]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                */}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9 ring-2 ring-transparent hover:ring-emerald-200 transition-all">
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || user?.email || "User"} />
                    <AvatarFallback className="bg-emerald-600 text-white text-sm font-semibold">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal pb-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.photoURL || undefined} />
                      <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">
                        {getUserInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-semibold leading-tight truncate">{displayName || user?.displayName || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t("accountSettings")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/?landing" className="cursor-pointer">
                    <Info className="mr-2 h-4 w-4" />
                    <span>{t("aboutPocket")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={process.env.NEXT_PUBLIC_FEEDBACK_URL ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Send Feedback</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  )
}
