"use client"

import { useTranslations } from "next-intl";

export const Services = () => {
  const t = useTranslations("landing.services");

  const services = [
    { titleKey: "service1Title", descKey: "service1Desc" },
    { titleKey: "service2Title", descKey: "service2Desc" },
    { titleKey: "service3Title", descKey: "service3Desc" },
  ];

  return (
    <section id="services" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        {t("title")} <span className="text-foreground">{t("services")}</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {services.map(({ titleKey, descKey }) => (
          <div key={titleKey} className="text-center p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-2">{t(titleKey)}</h3>
            <p className="text-muted-foreground">{t(descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

