"use client"

import Link from "next/link";
import { Button } from "./ui/button";
import { buttonVariants } from "./ui/button";
import { HeroCards } from "./HeroCards";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export const Hero = () => {
  const { user } = useAuth();
  const t = useTranslations("landing.hero");

  return (
    <section className="container flex flex-col justify-center md:grid lg:grid-cols-2 md:place-items-center py-12 px-4 sm:py-16 md:py-24 lg:py-32 gap-6 md:gap-10">
      <div className="text-center lg:text-start space-y-5 md:space-y-6 flex flex-col justify-center">
        <main className="space-y-2">
          {/* Beta badge */}
          <motion.div
            className="flex justify-center lg:justify-start mb-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Beta · Early Access
            </span>
          </motion.div>

          <motion.h1
            className="block text-4xl sm:text-5xl md:text-6xl font-poppins font-bold text-foreground leading-tight tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            Pocket
          </motion.h1>
          <motion.h2
            className="block text-lg sm:text-xl md:text-2xl font-inter font-medium text-foreground/70 leading-snug"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          >
            {t("tagline")}
          </motion.h2>
        </main>

        <motion.p
          className="text-base md:text-lg text-muted-foreground leading-relaxed md:w-10/12 mx-auto lg:mx-0 px-2 sm:px-0 font-normal"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
        >
          {t("description")}
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
        >
          {user ? (
            <Link href="/dashboard" className="sm:w-40">
              <Button className="w-full">{t("goToDashboard")}</Button>
            </Link>
          ) : (
            <Link href="/auth/register" className="sm:w-40">
              <Button className="w-full">{t("getStarted")}</Button>
            </Link>
          )}

          <a
            rel="noreferrer noopener"
            href="#features"
            className={`sm:w-36 ${buttonVariants({
              variant: "outline",
            })}`}
          >
            {t("learnMore")}
          </a>
        </motion.div>
      </div>

      {/* Hero cards sections with shadow effect */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.25, ease: "easeOut" }}
      >
        {/* Shadow effect - positioned behind cards */}
        <div className="shadow"></div>
        <HeroCards />
      </motion.div>
    </section>
  );
};

