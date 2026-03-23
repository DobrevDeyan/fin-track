"use client"

import Link from "next/link";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";
import { LightBulbIcon } from "./Icons";
import Image from "next/image";

export const HeroCards = () => {
  return (
    <div className="hidden lg:flex flex-row flex-wrap gap-8 relative lg:w-[480px] xl:w-[580px] lg:h-[420px] xl:h-[480px] z-10">

      {/* App preview — mobile screenshot */}
      <Card className="absolute right-0 top-2 lg:w-56 xl:w-64 drop-shadow-xl shadow-black/10 overflow-hidden p-0">
        <div className="relative w-full lg:h-[160px] xl:h-[185px]">
          <Image
            src="/images/dashboard_mob.png"
            alt="Pocket mobile dashboard"
            fill
            className="object-cover object-top rounded-t-lg"
            sizes="(min-width: 1280px) 256px, 224px"
          />
        </div>
        <CardContent className="py-3 text-center">
          <p className="text-sm font-medium">Works on all devices</p>
          <p className="text-xs text-muted-foreground">Installable PWA — no app store needed</p>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="absolute lg:top-[130px] xl:top-[150px] lg:left-[10px] xl:left-[30px] lg:w-56 xl:w-64 drop-shadow-xl shadow-black/10">
        <CardHeader>
          <CardTitle>Free</CardTitle>
          <div>
            <span className="text-3xl font-bold">€0</span>
            <span className="text-muted-foreground"> /month</span>
          </div>
          <CardDescription>
            Get started with personal finance tracking.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Link href="/auth/register" className="w-full">
            <Button className="w-full">Get Started Free</Button>
          </Link>
        </CardContent>

        <hr className="w-4/5 m-auto mb-4" />

        <CardFooter className="flex">
          <div className="space-y-4">
            {["50 transactions/month", "Up to 3 budgets", "Financial health score"].map(
              (benefit: string) => (
                <span key={benefit} className="flex">
                  <Check className="text-green-500" />{" "}
                  <h3 className="ml-2">{benefit}</h3>
                </span>
              )
            )}
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
            <CardTitle>AI-Powered Insights</CardTitle>
            <CardDescription className="text-md mt-2">
              Monthly AI digest, budget coach chat, and 90-day cash flow forecast — available on Pro.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};
