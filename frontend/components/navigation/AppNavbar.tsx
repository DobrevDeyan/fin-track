"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, X, Globe, Info, LayoutDashboard, Calendar as CalendarIcon, FileText, Settings } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateUserCurrency, updateUserLanguage } from "@/lib/firestore-users"
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/constants/currency.constants"
import { useCurrency } from "@/contexts/CurrencyContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { locales, localeNames, type Locale } from "@/i18n/config"
import { ERROR_MESSAGES } from "@/lib/constants/validation.constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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

  // Swipe-to-close gesture tracking
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    // Close if swiped right >60px and gesture is more horizontal than vertical
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

  return (
    <>
      {/* Floating menu button - mobile only, visible when scrolled */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-2xl",
          "bg-[#4CAF50] overflow-hidden",
          "z-50",
          "transition-all duration-300",
          "hover:scale-110 active:scale-95",
          "flex items-center justify-center",
          "md:hidden",
          showFloatingMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        aria-label="Open menu"
      >
        <Image
          src="/icons/icon-192x192.png"
          alt="Menu"
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      </button>

      {/* Mobile Sheet menu - controlled, no trigger */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-[320px] sm:w-[380px] [&>button]:hidden p-0 flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Profile header with animated gradient */}
          <div
            className="px-6 pt-6 pb-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #35DB96, #2E7D32, #1a1a1a, #35DB96)",
              backgroundSize: "300% 300%",
              animation: "navGradientShift 8s ease infinite",
            }}
          >
            <SheetHeader className="mb-0">
              <div className="flex items-center justify-between mb-4">
                <SheetTitle className="font-bold text-xl text-left text-white">
                  Pocket
                </SheetTitle>
                <SheetClose asChild>
                  <button
                    className="rounded-full p-1.5 hover:bg-white/20 transition-colors duration-200 focus:outline-none"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5 text-white/80" strokeWidth={2.5} />
                  </button>
                </SheetClose>
              </div>
            </SheetHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-white/30">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || user?.email || "User"} />
                <AvatarFallback className="bg-white/20 text-white font-semibold text-lg">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-white font-semibold text-sm truncate">
                  {displayName || user?.displayName || "User"}
                </span>
                <span className="text-white/70 text-xs truncate">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col flex-1 px-4 pt-4 pb-6">
            <div className="flex flex-col gap-1">
              {appRoutes.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 relative group",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold shadow-sm"
                        : "text-foreground/70 hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-lg transition-colors duration-200",
                      isActive
                        ? "bg-primary/15"
                        : "bg-muted group-hover:bg-accent"
                    )}>
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    {label}
                    {isActive && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Settings section */}
            <div className="mt-6 pt-5 border-t border-border/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-4 mb-2 block">
                {t("settings")}
              </span>
              <div className="flex gap-2 w-full mt-2">
                <Select value={userCurrency} onValueChange={handleCurrencyChange} disabled={currencyLoading}>
                  <SelectTrigger className="flex-1 h-10 text-sm font-medium rounded-xl bg-muted/50 border-0 hover:bg-muted transition-colors">
                    <SelectValue placeholder="EUR" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={locale} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="flex-1 h-10 text-sm font-medium rounded-xl bg-muted/50 border-0 hover:bg-muted transition-colors">
                    <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locales.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {localeNames[loc]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Account settings + Logout at bottom */}
            <div className="mt-auto pt-4 space-y-1">
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200",
                  pathname === "/settings"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted">
                  <Settings className="h-[18px] w-[18px]" />
                </div>
                {t("accountSettings")}
              </Link>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full h-11 rounded-xl font-medium text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </Button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>

    <header className="sticky border-b-[1px] top-0 z-40 w-full bg-white border-gray-200">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="container h-14 px-4 flex justify-between w-full">
          <NavigationMenuItem className="flex">
            <Link
              href="/dashboard"
              className="ml-2 font-semibold text-xl tracking-tight flex items-center gap-2"
            >
              <Image
                src="/icons/icon-32x32.png"
                alt="Pocket Logo"
                width={32}
                height={32}
                className="w-6 h-6"
                priority
              />
              <span className="text-foreground">Pocket</span>
            </Link>
          </NavigationMenuItem>

          {/* mobile hamburger */}
          <button
            className="flex md:hidden px-2"
            onClick={() => setIsOpen(true)}
            aria-label={t("menu")}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* desktop */}
          <nav className="hidden md:flex gap-1">
            {appRoutes.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex gap-2 items-center">
            {/* Language selector */}
            <Select value={locale} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[100px]">
                <Globe className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locales.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {localeNames[loc]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Currency selector */}
            <Select value={userCurrency} onValueChange={handleCurrencyChange} disabled={currencyLoading}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="EUR" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* User avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || user?.email || "User"} />
                    <AvatarFallback className="bg-black text-white">
                      {getUserInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
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
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
    </>
  )
}
