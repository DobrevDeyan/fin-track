"use client"

import Link from "next/link";
import { LogoIcon } from "./Icons";
import { useTranslations } from "next-intl";

export const Footer = () => {
  const t = useTranslations("landing.footer");
  const tNav = useTranslations("nav");

  return (
    <footer id="footer" className="border-t border-border bg-background">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left side - Logo and Company Info */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4"
            >
              <LogoIcon />
              <span className="font-semibold text-xl text-foreground">
                Pocket
              </span>
            </Link>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Pocket</p>
              <p>{t("tagline")}</p>
              <p className="mt-4">
                {t("interactiveLayer")}
              </p>
              <p className="mt-6 text-xs">
                &copy; {new Date().getFullYear()} Pocket
              </p>
            </div>
          </div>

          {/* Product Column */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-foreground">{t("product")}</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {tNav("features")}
              </Link>
              <Link
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {tNav("pricing")}
              </Link>
              <Link
                href="#faq"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {tNav("faq")}
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {tNav("dashboard")}
              </Link>
            </div>
          </div>

          {/* Use Cases Column */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-foreground">{t("solutions")}</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("personalFinance")}
              </Link>
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("budgetTracking")}
              </Link>
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("expenseManagement")}
              </Link>
            </div>
          </div>

          {/* Legal Column */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-foreground">{t("company")}</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="#about"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("about")}
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("privacyPolicy")}
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("termsOfService")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
