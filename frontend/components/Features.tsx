"use client"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface FeatureProps {
  titleKey: string;
  descKey: string;
  icon: string;
}

const featureKeys: FeatureProps[] = [
  { titleKey: "feature1Title", descKey: "feature1Desc", icon: "📊" },
  { titleKey: "feature2Title", descKey: "feature2Desc", icon: "✨" },
  { titleKey: "feature3Title", descKey: "feature3Desc", icon: "🧾" },
];

export const Features = () => {
  const t = useTranslations("landing.features");

  return (
    <section id="features" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
        {t("title")}{" "}
        <span className="text-foreground">
          {t("features")}
        </span>
      </h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featureKeys.map(({ titleKey, descKey, icon }) => (
          <Card key={titleKey}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-4xl">{icon}</span>
                {t(titleKey)}
              </CardTitle>
              <CardDescription className="text-lg mt-4">
                {t(descKey)}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
};
