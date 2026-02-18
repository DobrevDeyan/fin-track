"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Menu, X, Globe } from "lucide-react"
import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/contexts/LanguageContext"
import { locales, localeNames, type Locale } from "@/i18n/config"

export const MarketingNavbar = () => {
  const t = useTranslations("nav")
  const [isOpen, setIsOpen] = useState(false)
  const { locale, setLocale } = useLanguage()

  const handleLanguageChange = async (newLocale: string) => {
    const loc = newLocale as Locale
    setLocale(loc)
  }

  const handleNavClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    if (typeof window === "undefined") return

    const hash = href.replace("#", "")
    const currentPath = window.location.pathname

    if (currentPath === "/") {
      const element = document.getElementById(hash)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    } else {
      window.location.href = `/${href}`
    }
    setIsOpen(false)
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const currentPath = window.location.pathname
    if (currentPath === "/") {
      const hash = window.location.hash.replace("#", "")
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash)
          if (element) {
            element.scrollIntoView({ behavior: "smooth" })
          }
        }, 100)
      }
    }
  }, [])

  const routeList = [
    { href: "#features", label: t("features") },
    { href: "#testimonials", label: t("testimonials") },
    { href: "#pricing", label: t("pricing") },
    { href: "#faq", label: t("faq") },
  ]

  return (
    <header className="sticky border-b-[1px] top-0 z-40 w-full bg-white border-gray-200">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="container h-14 px-4 flex justify-between w-full">
          <NavigationMenuItem className="flex">
            <Link
              href="/"
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
                  {routeList.map(({ href, label }) => (
                    <a
                      rel="noreferrer noopener"
                      key={label}
                      href={href}
                      onClick={(e) => handleNavClick(href, e)}
                      className="text-center px-4 py-3 rounded-lg text-base font-medium text-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors duration-200"
                    >
                      {label}
                    </a>
                  ))}
                  <div className="w-full mt-4 mb-2">
                    <Select value={locale} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full h-11 text-base font-medium border-2">
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
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full h-12 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-base shadow-md hover:bg-primary/90 hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                  >
                    {t("login")}
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </span>

          {/* desktop */}
          <nav className="hidden md:flex gap-2">
            {routeList.map((route, i) => (
              <a
                rel="noreferrer noopener"
                href={route.href}
                key={i}
                onClick={(e) => handleNavClick(route.href, e)}
                className={`text-[17px] ${buttonVariants({ variant: "ghost" })}`}
              >
                {route.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex gap-2 items-center">
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
            <Link href="/auth/login">
              <Button>{t("login")}</Button>
            </Link>
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  )
}
