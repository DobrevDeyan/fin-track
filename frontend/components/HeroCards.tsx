"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { LightBulbIcon } from "./Icons";
import Image from "next/image";
import { useTranslations } from "next-intl";

export const HeroCards = () => {
  const t = useTranslations("landing.heroCards");

  return (
    <>
      {/* ── Mobile preview (< md) ─────────────────────────────────── */}
      <div className="block md:hidden mt-6">
        <div className="bg-card border rounded-2xl p-4 shadow-lg text-left max-w-xs mx-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {t("netBalance")}
          </p>
          <p className="text-2xl font-bold tracking-tight">€2,576.52</p>
          <p className="text-[10px] text-muted-foreground mb-3">{t("allTimeNet")}</p>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t text-xs">
            <div>
              <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span>{t("income")}</span>
              </div>
              <p className="font-bold text-emerald-600">€1,400</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span>{t("spending")}</span>
              </div>
              <p className="font-bold text-red-500">€842</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                <Wallet className="h-3 w-3 text-blue-500" />
                <span>{t("net")}</span>
              </div>
              <p className="font-bold">€558</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tablet preview (md–lg) ───────────────────────────────────── */}
      <div className="hidden md:flex lg:hidden justify-center mt-8">
        <div className="flex gap-4 items-start">
          <Card className="w-60 drop-shadow-xl shadow-black/10 overflow-hidden p-0 shrink-0">
            <div className="relative w-full h-[170px]">
              <Image
                src="/images/dashboard_mob.webp"
                alt="Pocket mobile dashboard"
                fill
                priority
                className="object-cover object-top rounded-t-lg"
                sizes="240px"
              />
            </div>
            <CardContent className="py-3 text-center">
              <p className="text-sm font-medium">{t("worksOnAllDevices")}</p>
              <p className="text-xs text-muted-foreground">{t("pwaTagline")}</p>
            </CardContent>
          </Card>

          <Card className="w-56 drop-shadow-xl shadow-black/10 shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("freePlan")}</CardTitle>
              <div>
                <span className="text-2xl font-bold">{t("freePlanPrice")}</span>
                <span className="text-muted-foreground text-sm"> /mo</span>
              </div>
              <CardDescription className="text-xs">{t("pricingDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <Link href="/auth/register" className="w-full">
                <Button className="w-full h-8 text-sm">{t("getStartedFree")}</Button>
              </Link>
            </CardContent>
            <CardFooter>
              <div className="space-y-2">
                {[t("freeFeature1"), t("freeFeature2"), t("freeFeature3")].map((f) => (
                  <span key={f} className="flex items-center text-xs">
                    <Check className="text-green-500 h-3.5 w-3.5 mr-1.5 shrink-0" />
                    {f}
                  </span>
                ))}
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* ── Desktop floating cards (lg+) ─────────────────────────────── */}
      <div className="hidden lg:flex flex-row flex-wrap gap-8 relative lg:w-[480px] xl:w-[580px] lg:h-[420px] xl:h-[480px] z-10">

        {/* App preview — mobile screenshot */}
        <Card className="absolute right-0 top-2 lg:w-56 xl:w-64 drop-shadow-xl shadow-black/10 overflow-hidden p-0">
          <div className="relative w-full lg:h-[160px] xl:h-[185px]">
            <Image
              src="/images/dashboard_mob.webp"
              alt="Pocket mobile dashboard"
              fill
              priority
              className="object-cover object-top rounded-t-lg"
              sizes="(min-width: 1280px) 256px, 224px"
            />
          </div>
          <CardContent className="py-3 text-center">
            <p className="text-sm font-medium">{t("worksOnAllDevices")}</p>
            <p className="text-xs text-muted-foreground">{t("pwaTagline")}</p>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="absolute lg:top-[130px] xl:top-[150px] lg:left-[10px] xl:left-[30px] lg:w-56 xl:w-64 drop-shadow-xl shadow-black/10">
          <CardHeader>
            <CardTitle>{t("freePlan")}</CardTitle>
            <div>
              <span className="text-3xl font-bold">{t("freePlanPrice")}</span>
              <span className="text-muted-foreground"> /month</span>
            </div>
            <CardDescription>{t("pricingDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/register" className="w-full">
              <Button className="w-full">{t("getStartedFree")}</Button>
            </Link>
          </CardContent>
          <hr className="w-4/5 m-auto mb-4" />
          <CardFooter className="flex">
            <div className="space-y-4">
              {[t("freeFeature1"), t("freeFeature2"), t("freeFeature3")].map((f) => (
                <span key={f} className="flex">
                  <Check className="text-green-500" />
                  <h3 className="ml-2">{f}</h3>
                </span>
              ))}
            </div>
          </CardFooter>
        </Card>

        {/* AI Insights */}
        <Card className="absolute lg:w-[260px] xl:w-[300px] right-0 lg:bottom-[20px] xl:bottom-[30px] drop-shadow-xl shadow-black/10">
          <CardHeader className="space-y-1 flex md:flex-row justify-start items-start gap-4">
            <div className="mt-1 bg-primary/20 p-1 rounded-2xl">
              <LightBulbIcon />
            </div>
            <div>
              <CardTitle>{t("aiInsightsTitle")}</CardTitle>
              <CardDescription className="text-md mt-2">
                {t("aiInsightsDesc")}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    </>
  );
};
