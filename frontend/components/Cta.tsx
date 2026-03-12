"use client"

import Link from "next/link";
import { Button } from "./ui/button";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";

export const Cta = () => {
  const t = useTranslations("landing.cta");
  const { user } = useAuth();

  return (
    <section className="container py-24 sm:py-32">
      <div className="bg-muted rounded-lg p-8 md:p-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-xl mb-8 max-w-2xl mx-auto">
          {t("description")}
        </p>
        <Link href={user ? "/dashboard" : "/auth/register"}>
          <Button size="lg" className="text-lg">
            {t("button")}
          </Button>
        </Link>
      </div>
    </section>
  );
};

