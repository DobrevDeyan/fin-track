"use client"

import { useTranslations } from "next-intl";

export const About = () => {
  const t = useTranslations("landing.about");

  return (
    <section id="about" className="container py-24 sm:py-32">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("title")} <span className="text-foreground">{t("pocket")}</span>
          </h2>
          <p className="text-muted-foreground text-xl mt-4 mb-8">
            {t("description")}
          </p>
        </div>
        <div className="flex justify-center">
          <div className="w-full max-w-md h-64 bg-muted rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">{t("visualPlaceholder")}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

