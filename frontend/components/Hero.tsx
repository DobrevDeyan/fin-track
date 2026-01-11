"use client"

import Link from "next/link";
import { Button } from "./ui/button";
import { buttonVariants } from "./ui/button";
import { HeroCards } from "./HeroCards";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { useAuth } from "@/contexts/AuthContext";

export const Hero = () => {
  const { user } = useAuth();
  
  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
      <div className="text-center lg:text-start space-y-6">
        <main className="text-5xl md:text-6xl font-bold">
          <h1 className="inline">
            <span className="inline text-foreground">
              FinTrack
            </span>{" "}
            - Smart
          </h1>{" "}
          Financial{" "}
          <h2 className="inline">
            <span className="inline text-foreground">
              Management
            </span>{" "}
            Made Easy
          </h2>
        </main>

        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
          Track your expenses, manage your budget, and gain insights into your spending with manual entry tracking.
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex md:flex-row">
          {user ? (
            <Link href="/dashboard" className="w-full md:w-1/3">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          ) : (
            <Link href="/auth/register" className="w-full md:w-1/3">
              <Button className="w-full">Get Started</Button>
            </Link>
          )}

          <a
            rel="noreferrer noopener"
            href="#features"
            className={`w-full md:w-1/3 ${buttonVariants({
              variant: "outline",
            })}`}
          >
            Learn More
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

