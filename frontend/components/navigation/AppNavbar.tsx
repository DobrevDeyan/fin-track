"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Menu, LogOut, X, Globe, Info, LayoutDashboard,
  Calendar as CalendarIcon, FileText, Settings, Receipt,
  Landmark, ChevronDown, DollarSign,
} from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { updateUserCurrency, updateUserLanguage } from "@/lib/firestore-users"
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/constants/currency.constants"
import { useCurrency } from "@/contexts/CurrencyContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { locales, localeNames, type Locale } from "@/i18n/config"
import { ERROR_MESSAGES } from "@/lib/constants/validation.constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { motion, AnimatePresence, type Variants } from "framer-motion"

export const AppNavbar = () => {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const { user, logout } = useAuth()
  const { userCurrency, refreshCurrency, displayName } = useCurrency()
  const { locale, setLocale } = useLanguage()

  const appRoutes = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/calendar", label: t("calendar"), icon: CalendarIcon },
    { href: "/reports", label: t("reports"), icon: FileText },
    { href: "/receipts", label: t("receipts"), icon: Receipt },
    { href: "/net-worth", label: t("netWorth"), icon: Landmark },
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

  const handleLanguageChange = async (newLocale: string) => {
    const loc = newLocale as Locale
    setLocale(loc)
    if (user) {
      try {
        await updateUserLanguage(user.uid, loc)
      } catch (error) {
        console.error("Error saving language:", error)
      }
    }
  }

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

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingMenu(window.scrollY > 100)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const mobileNavVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.06, duration: 0.25, ease: "easeOut" },
    }),
  }

  return (
    <>
      {/* Floating FAB - mobile only */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-2xl",
          "bg-[#4CAF50] overflow-hidden z-50",
          "flex items-center justify-center md:hidden",
        )}
        animate={showFloatingMenu ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.85 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ pointerEvents: showFloatingMenu ? "auto" : "none" }}
        aria-label="Open menu"
        whileTap={{ scale: 0.9 }}
      >
        <Image src="/icons/icon-192x192.png" alt="Menu" width={56} height={56} className="w-full h-full object-cover" />
      </motion.button>

      {/* Mobile Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-[300px] sm:w-[340px] [&>button]:hidden p-0 flex flex-col border-l-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Gradient header */}
          <div
            className="px-5 pt-6 pb-6 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a4731 100%)",
            }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-emerald-500/10" />

            <SheetHeader className="mb-0">
              <div className="flex items-center justify-between mb-5">
                <SheetTitle className="font-bold text-lg text-white tracking-tight">
                  Pocket
                </SheetTitle>
                <SheetClose asChild>
                  <button
                    className="rounded-full p-1.5 hover:bg-white/15 transition-colors duration-200 focus:outline-none"
                    aria-label="Close menu"
                  >
                    <X className="h-4 w-4 text-white/70" strokeWidth={2.5} />
                  </button>
                </SheetClose>
              </div>
            </SheetHeader>

            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-11 w-11 ring-2 ring-emerald-400/40">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-emerald-500/30 text-white font-semibold text-base">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[#0f3460]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white font-semibold text-sm truncate leading-tight">
                  {displayName || user?.displayName || "User"}
                </span>
                <span className="text-white/50 text-xs truncate mt-0.5">
                  {user?.email}
                </span>
              </div>
            </div>

            {/* Currency + Language pills */}
            <div className="flex gap-2 mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-medium">
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                    {userCurrency}
                    <ChevronDown className="h-3 w-3 text-white/50" />
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-medium">
                    <Globe className="h-3 w-3 text-emerald-400" />
                    {localeNames[locale as Locale] ?? locale.toUpperCase()}
                    <ChevronDown className="h-3 w-3 text-white/50" />
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
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col flex-1 px-3 pt-3 pb-4 overflow-y-auto">
            <div className="flex flex-col gap-0.5">
              {appRoutes.map(({ href, label, icon: Icon }, i) => {
                const isActive = pathname === href
                return (
                  <motion.div
                    key={href}
                    custom={i}
                    initial="hidden"
                    animate={isOpen ? "visible" : "hidden"}
                    variants={mobileNavVariants}
                  >
                    <Link
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 relative group",
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-foreground/65 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-lg transition-colors duration-150 shrink-0",
                        isActive
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-muted/70 text-muted-foreground group-hover:bg-accent"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span>{label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="mobileActiveIndicator"
                          className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500"
                        />
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </div>

            {/* Bottom actions */}
            <div className="mt-auto pt-3 border-t border-border/40 space-y-0.5">
              <motion.div
                custom={appRoutes.length}
                initial="hidden"
                animate={isOpen ? "visible" : "hidden"}
                variants={mobileNavVariants}
              >
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150",
                    pathname === "/settings"
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-foreground/65 hover:bg-accent hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/70">
                    <Settings className="h-4 w-4" />
                  </div>
                  {t("accountSettings")}
                </Link>
              </motion.div>

              <motion.div
                custom={appRoutes.length + 1}
                initial="hidden"
                animate={isOpen ? "visible" : "hidden"}
                variants={mobileNavVariants}
              >
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/70">
                    <LogOut className="h-4 w-4" />
                  </div>
                  {t("logout")}
                </button>
              </motion.div>
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="h-14 px-4 flex items-center justify-between max-w-screen-2xl mx-auto">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg tracking-tight shrink-0">
            <Image src="/icons/icon-32x32.png" alt="Pocket Logo" width={28} height={28} className="w-6 h-6" priority />
            <span className="text-foreground">Pocket</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            className="flex md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setIsOpen(true)}
            aria-label={t("menu")}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop nav — icon pills with tooltips */}
          <TooltipProvider delayDuration={400}>
            <nav className="hidden md:flex items-center gap-1 bg-gray-50 rounded-xl p-1">
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
                            ? "bg-white text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/70"
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

          {/* Desktop right — avatar dropdown (consolidates everything) */}
          <div className="hidden md:flex items-center gap-2">
            {/* Currency + Language compact badges */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 border border-transparent hover:border-border/50">
                  <span className="text-xs font-semibold">{userCurrency}</span>
                  <span className="text-border">·</span>
                  <Globe className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">{locale.toUpperCase()}</span>
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
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pb-1">Language</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={locale} onValueChange={handleLanguageChange}>
                  {locales.map((loc) => (
                    <DropdownMenuRadioItem key={loc} value={loc} className="text-sm">
                      {localeNames[loc]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Avatar dropdown */}
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
