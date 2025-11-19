"use client"

import { useState } from "react";
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
} from "@/components/ui/sheet";

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { buttonVariants } from "./ui/button";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import { ModeToggle } from "./mode-toggle";
import { LogoIcon } from "./Icons";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user, loading } = useAuth();

  return (
    <header className="sticky border-b-[1px] top-0 z-40 w-full bg-white dark:border-b-slate-700 dark:bg-background">
      <NavigationMenu className="mx-auto">
        <NavigationMenuList className="container h-14 px-4 w-screen flex justify-between ">
          <NavigationMenuItem className="font-bold flex">
            <Link
              href="/"
              className="ml-2 font-bold text-xl flex"
            >
              <LogoIcon />
              FinTrack
            </Link>
          </NavigationMenuItem>

          {/* mobile */}
          <span className="flex md:hidden">
            <ModeToggle />

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

              <SheetContent side={"left"}>
                <SheetHeader>
                  <SheetTitle className="font-bold text-xl">
                    FinTrack
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col justify-center items-center gap-2 mt-4">
                  {routeList.map(({ href, label }: RouteProps) => (
                    <a
                      rel="noreferrer noopener"
                      key={label}
                      href={href}
                      onClick={() => setIsOpen(false)}
                      className={buttonVariants({ variant: "ghost" })}
                    >
                      {label}
                    </a>
                  ))}
                  {!loading && (
                    <>
                      {user ? (
                        <Link
                          href="/dashboard"
                          onClick={() => setIsOpen(false)}
                          className={buttonVariants({ variant: "default" })}
                        >
                          Dashboard
                        </Link>
                      ) : (
                        <Link
                          href="/auth/login"
                          onClick={() => setIsOpen(false)}
                          className={buttonVariants({ variant: "default" })}
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
                className={`text-[17px] ${buttonVariants({
                  variant: "ghost",
                })}`}
              >
                {route.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex gap-2">
            {!loading && (
              <>
                {user ? (
                  <Link href="/dashboard">
                    <Button>Dashboard</Button>
                  </Link>
                ) : (
                  <Link href="/auth/login">
                    <Button>Login</Button>
                  </Link>
                )}
              </>
            )}
            <ModeToggle />
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
};

