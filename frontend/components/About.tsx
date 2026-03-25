"use client"

import Image from "next/image";
import { useTranslations } from "next-intl";

export const About = () => {
  const t = useTranslations("landing.about");

  return (
    <section id="about" className="container py-24 sm:py-32">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t("title")} <span className="text-foreground">{t("pocket")}</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg mt-4 mb-8">
            {t("description")}
          </p>
        </div>
        <div className="flex justify-center">
          <Image
            src="/images/dashboard.png"
            alt="Pocket dashboard"
            width={600}
            height={380}
            className="w-full max-w-xl rounded-xl shadow-xl border border-border"
          />
        </div>
      </div>
    </section>
  );
};
