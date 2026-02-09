"use client"

import { Button } from "./ui/button";
import { useTranslations } from "next-intl";

export const Cta = () => {
  const t = useTranslations("landing.cta");

  return (
    <section className="container py-24 sm:py-32">
      <div className="bg-muted rounded-lg p-8 md:p-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          {t("title")}
        </h2>
        <p className="text-muted-foreground text-xl mb-8 max-w-2xl mx-auto">
          {t("description")}
        </p>
        <Button size="lg" className="text-lg">
          {t("button")}
        </Button>
      </div>
    </section>
  );
};

