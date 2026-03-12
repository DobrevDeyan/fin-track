"use client"

import Link from "next/link";
import { Button } from "./ui/button";
import { buttonVariants } from "./ui/button";
import { HeroCards } from "./HeroCards";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";

export const Hero = () => {
  const { user } = useAuth();
  const t = useTranslations("landing.hero");

  return (
    <section className="container flex flex-col justify-center min-h-[calc(100vh-4rem)] md:min-h-0 md:grid lg:grid-cols-2 md:place-items-center py-12 px-4 sm:py-16 md:py-32 gap-8 md:gap-10">
      <div className="text-center lg:text-start space-y-5 md:space-y-6 flex flex-col justify-center">
        <main className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight sm:leading-tight md:leading-normal tracking-tight">
          <h1 className="block font-poppins font-bold text-foreground">
            <span className="inline">
              Pocket
            </span>
          </h1>
          <h2 className="block font-inter font-semibold text-foreground/90">
            {t("tagline")}
          </h2>
        </main>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed md:w-10/12 mx-auto lg:mx-0 px-2 sm:px-0 font-normal">
          {t("description")}
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex md:flex-row">
          {user ? (
            <Link href="/dashboard" className="w-full md:w-1/3">
              <Button className="w-full">{t("goToDashboard")}</Button>
            </Link>
          ) : (
            <Link href="/auth/register" className="w-full md:w-1/3">
              <Button className="w-full">{t("getStarted")}</Button>
            </Link>
          )}

          <a
            rel="noreferrer noopener"
            href="#features"
            className={`w-full md:w-1/3 ${buttonVariants({
              variant: "outline",
            })}`}
          >
            {t("learnMore")}
          </a>
        </div>
      </div>

      {/* Hero cards sections with shadow effect */}
      <div className="relative z-10">
        {/* Shadow effect - positioned behind cards */}
        <div className="shadow"></div>
        <HeroCards />
      </div>
    </section>
  );
};

