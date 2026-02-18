"use client"

import { useState } from "react"
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
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, LogOut, X, Globe, Info, LayoutDashboard, Calendar as CalendarIcon, FileText } from "lucide-react"
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

export const AppNavbar = () => {
  const t = useTranslations("nav")
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const { user, logout } = useAuth()
  const { userCurrency, refreshCurrency } = useCurrency()
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
      alert(ERROR_MESSAGES.CURRENCY_UPDATE_FAILED)
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

  return (
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

          {/* mobile */}
          <span className="flex md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger className="px-2">
                <Menu
                  className="flex md:hidden h-5 w-5"
                  onClick={() => setIsOpen(true)}
                >
                  <span className="sr-only">{t("menu")}</span>
                </Menu>
              </SheetTrigger>

              <SheetContent side="right" className="w-[320px] sm:w-[380px] [&>button]:hidden">
                <SheetHeader className="mb-6 relative">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="font-bold text-2xl text-left">
                      <span className="text-foreground">Pocket</span>
                    </SheetTitle>
                    <SheetClose asChild>
                      <button
                        className="rounded-full p-2 hover:bg-accent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 -mr-2"
                        aria-label="Close menu"
                      >
                        <X className="h-6 w-6 text-foreground/70 hover:text-foreground transition-colors" strokeWidth={2.5} />
                      </button>
                    </SheetClose>
                  </div>
                </SheetHeader>
                <nav className="flex flex-col gap-2">
                  {appRoutes.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200",
                        pathname === href
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  ))}

                  {/* Currency & Language selectors */}
                  <div className="flex gap-2 w-full mt-4 mb-2">
                    <Select value={userCurrency} onValueChange={handleCurrencyChange} disabled={currencyLoading}>
                      <SelectTrigger className="flex-1 h-11 text-base font-medium border-2">
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
                      <SelectTrigger className="flex-1 h-11 text-base font-medium border-2">
                        <Globe className="h-4 w-4 mr-1.5" />
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

                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full h-12 px-6 py-3 rounded-lg border-2 font-semibold text-base hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all duration-200 flex items-center justify-center mt-2"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("logout")}
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </span>

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
  )
}
