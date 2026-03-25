"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Menu, X, Globe, ChevronDown, ChevronRight,
  Sparkles, CreditCard, HelpCircle, MessageSquare, LogIn, UserPlus, LayoutGrid,
} from "lucide-react"
import Image from "next/image"
import { PocketLogo } from "@/components/PocketLogo"
import { useLanguage } from "@/contexts/LanguageContext"
import { locales, localeNames, type Locale } from "@/i18n/config"
import { cn } from "@/lib/utils"
import { motion, type Variants } from "framer-motion"

const itemVariants: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.22, ease: "easeOut" as const },
  }),
}

export const MarketingNavbar = () => {
  const t = useTranslations("nav")
  const [isOpen, setIsOpen] = useState(false)
  const { locale, setLocale } = useLanguage()

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale as Locale)
  }

  const handleNavClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (typeof window === "undefined") return
    const hash = href.replace("#", "")
    if (window.location.pathname === "/") {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" })
    } else {
      window.location.href = `/${href}`
    }
    setIsOpen(false)
  }

  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/") return
    const hash = window.location.hash.replace("#", "")
    if (hash) {
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 100)
    }
  }, [])

  const routeList = [
    { href: "#features",     label: t("features"),     icon: Sparkles },
    { href: "#testimonials", label: t("testimonials"), icon: MessageSquare },
    { href: "#pricing",      label: t("pricing"),      icon: CreditCard },
    { href: "#faq",          label: t("faq"),          icon: HelpCircle },
  ]

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight shrink-0">
          <PocketLogo width={28} height={28} className="w-6 h-6" priority />
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

        {/* Desktop nav — pill container matching AppNavbar */}
        <nav className="hidden md:flex items-center gap-1 bg-muted rounded-xl p-1">
          {routeList.map((route) => (
            <a
              key={route.href}
              href={route.href}
              onClick={(e) => handleNavClick(route.href, e)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-background/70 transition-all duration-200"
            >
              {route.label}
            </a>
          ))}
        </nav>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 border border-transparent hover:border-border/50">
                <Globe className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">{locale.toUpperCase()}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
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

          <Link href="/auth/login">
            <Button variant="outline" size="sm">{t("login")}</Button>
          </Link>
          <Link href="/auth/register">
            <Button size="sm">{t("getStarted")}</Button>
          </Link>
        </div>
      </div>

      {/* Mobile sheet — matches AppNavbar style */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-[300px] sm:w-[340px] [&>button]:hidden p-0 flex flex-col border-l-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

          {/* Header */}
          <div className="px-5 pt-6 pb-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <PocketLogo width={24} height={24} className="w-5 h-5" />
                <span className="font-bold text-lg text-foreground tracking-tight">Pocket</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 bg-muted hover:bg-muted/80 transition-colors focus:outline-none"
                aria-label="Close menu"
              >
                <X className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
              </button>
            </div>

            {/* Language pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-foreground text-xs font-medium">
                  <Globe className="h-3 w-3 text-emerald-600" />
                  {localeNames[locale as Locale] ?? locale.toUpperCase()}
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
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

          <div className="h-px bg-border/50" />

          {/* Nav content */}
          <nav className="flex flex-col flex-1 px-4 py-5 overflow-y-auto gap-5">

            {/* Explore */}
            <motion.div custom={0} initial="hidden" animate={isOpen ? "visible" : "hidden"} variants={itemVariants}>
              <p className="text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-widest mb-2 px-1">
                Explore
              </p>
              <div className="rounded-2xl overflow-hidden bg-muted/50">
                {routeList.map(({ href, label, icon: Icon }, i) => (
                  <div key={href}>
                    {i > 0 && <div className="h-px bg-border/60 mx-4" />}
                    <a
                      href={href}
                      onClick={(e) => handleNavClick(href, e)}
                      className="flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium text-foreground/65 hover:text-foreground transition-colors duration-150"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-background text-muted-foreground shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    </a>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Account */}
            <motion.div custom={1} initial="hidden" animate={isOpen ? "visible" : "hidden"} variants={itemVariants}>
              <p className="text-[11px] text-muted-foreground/60 font-semibold uppercase tracking-widest mb-2 px-1">
                Account
              </p>
              <div className="rounded-2xl overflow-hidden bg-muted/50">
                <Link
                  href="/auth/login"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium text-foreground/65 hover:text-foreground transition-colors duration-150"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-background text-muted-foreground shrink-0">
                    <LogIn className="h-4 w-4" />
                  </div>
                  <span className="flex-1">{t("login")}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                </Link>
                <div className="h-px bg-border/60 mx-4" />
                <Link
                  href="/auth/register"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-[14px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors duration-150"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <span className="flex-1">{t("getStarted")}</span>
                  <ChevronRight className="h-4 w-4 text-emerald-600/40 shrink-0" />
                </Link>
              </div>
            </motion.div>

          </nav>
        </SheetContent>
      </Sheet>
    </header>
  )
}
