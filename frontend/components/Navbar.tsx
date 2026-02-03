"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { buttonVariants } from "./ui/button";
import { Button } from "./ui/button";
import { Menu, LogOut, User, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { getUserDocument, updateUserCurrency } from "@/lib/firestore-users";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/constants/currency.constants";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ERROR_MESSAGES } from "@/lib/constants/validation.constants";

interface RouteProps {
  href: string;
  label: string;
}

const routeList: RouteProps[] = [
  {
    href: "#features",
    label: "Features",
  },
  {
    href: "#testimonials",
    label: "Testimonials",
  },
  {
    href: "#pricing",
    label: "Pricing",
  },
  {
    href: "#faq",
    label: "FAQ",
  },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currencyLoading, setCurrencyLoading] = useState(false);
  const { user, loading, logout } = useAuth();
  const { userCurrency, refreshCurrency } = useCurrency();

  const handleCurrencyChange = async (currency: SupportedCurrency) => {
    if (!user || currencyLoading) return;
    try {
      setCurrencyLoading(true);
      await updateUserCurrency(user.uid, currency);
      // Refresh currency context instead of reloading page
      await refreshCurrency();
      // Small delay to ensure context updates, then reload for full app refresh
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error("Error updating currency:", error);
      alert(ERROR_MESSAGES.CURRENCY_UPDATE_FAILED);
    } finally {
      setCurrencyLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await logout();
      // logout() now handles redirect internally
    } catch (error) {
      console.error("Failed to logout:", error);
      // Force redirect even on error
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
  };

  const getUserInitials = (user: any) => {
    if (user?.displayName) {
      const names = user.displayName.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleNavClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (typeof window === "undefined") return;
    
    const hash = href.replace("#", "");
    const currentPath = window.location.pathname;
    
    if (currentPath === "/") {
      // Already on home page, just scroll to section
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Navigate to home page first, then scroll to section
      window.location.href = `/${href}`;
    }
    setIsOpen(false);
  };

  // Handle hash navigation after page load
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const currentPath = window.location.pathname;
    if (currentPath === "/") {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        // Wait for page to render, then scroll
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    }
  }, []);

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
              <span className="text-foreground">
                Pocket
              </span>
            </Link>
          </NavigationMenuItem>

          {/* mobile */}
          <span className="flex md:hidden">
            <Sheet
              open={isOpen}
              onOpenChange={setIsOpen}
            >
              <SheetTrigger className="px-2">
                <Menu
                  className="flex md:hidden h-5 w-5"
                  onClick={() => setIsOpen(true)}
                >
                  <span className="sr-only">Menu Icon</span>
                </Menu>
              </SheetTrigger>

              <SheetContent side={"right"} className="w-[320px] sm:w-[380px] [&>button]:hidden">
                <SheetHeader className="mb-6 relative">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="font-bold text-2xl text-left">
                      <span className="text-foreground">
                        Pocket
                      </span>
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
                  {routeList.map(({ href, label }: RouteProps) => (
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
                  {!loading && (
                    <>
                      {user ? (
                        <>
                          <div className="w-full mt-4 mb-2">
                            <Select value={userCurrency} onValueChange={handleCurrencyChange} disabled={currencyLoading}>
                              <SelectTrigger className="w-full h-11 text-base font-medium border-2">
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
                          </div>
                          <Link
                            href="/dashboard"
                            onClick={() => setIsOpen(false)}
                            className="w-full h-12 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-base shadow-md hover:bg-primary/90 hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                          >
                            Dashboard
                          </Link>
                          <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full h-12 px-6 py-3 rounded-lg border-2 font-semibold text-base hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all duration-200 flex items-center justify-center"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                          </Button>
                        </>
                      ) : (
                        <Link
                          href="/auth/login"
                          onClick={() => setIsOpen(false)}
                          className="w-full h-12 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-base shadow-md hover:bg-primary/90 hover:shadow-lg transition-all duration-200 flex items-center justify-center mt-4"
                        >
                          Login
                        </Link>
                      )}
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </span>

          {/* desktop */}
          <nav className="hidden md:flex gap-2">
            {routeList.map((route: RouteProps, i) => (
              <a
                rel="noreferrer noopener"
                href={route.href}
                key={i}
                onClick={(e) => handleNavClick(route.href, e)}
                className={`text-[17px] ${buttonVariants({
                  variant: "ghost",
                })}`}
              >
                {route.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex gap-2 items-center">
            {!loading && (
              <>
                {user ? (
                  <>
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
                    <Link href="/dashboard">
                      <Button>Dashboard</Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "User"} />
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
                              {user.displayName || "User"}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard" className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Link href="/auth/login">
                    <Button>Login</Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
};

