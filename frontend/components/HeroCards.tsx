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
    <div className="hidden lg:flex flex-row flex-wrap gap-8 relative w-[700px] h-[500px] z-10">
      {/* Testimonial — hidden for now */}
      {/* <Card className="absolute w-[340px] -top-[15px] drop-shadow-xl shadow-black/10">
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">MK</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <CardTitle className="text-lg">Maria K.</CardTitle>
            <CardDescription>@mariak</CardDescription>
          </div>
        </CardHeader>
        <CardContent>Finally a budgeting app that keeps it simple. The expense tracking and budget alerts are exactly what I needed.</CardContent>
      </Card> */}

      {/* App preview — mobile screenshot */}
      <Card className="absolute right-[20px] top-4 w-72 drop-shadow-xl shadow-black/10 overflow-hidden p-0">
        <div className="relative w-full h-[200px]">
          <Image
            src="/images/dashboard_mob.png"
            alt="Pocket mobile dashboard"
            fill
            className="object-cover object-top rounded-t-lg"
            sizes="288px"
          />
        </div>
        <CardContent className="py-3 text-center">
          <p className="text-sm font-medium">Works on all devices</p>
          <p className="text-xs text-muted-foreground">Installable PWA — no app store needed</p>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="absolute top-[150px] left-[50px] w-72 drop-shadow-xl shadow-black/10">
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

      {/* Service */}
      <Card className="absolute w-[350px] -right-[10px] bottom-[35px] drop-shadow-xl shadow-black/10">
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
