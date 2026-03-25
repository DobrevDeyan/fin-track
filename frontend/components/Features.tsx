"use client"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

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
      <motion.h2
        className="text-2xl md:text-3xl font-bold text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {t("title")}{" "}
        <span className="text-foreground">
          {t("features")}
        </span>
      </motion.h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {featureKeys.map(({ titleKey, descKey, icon }, index) => (
          <motion.div
            key={titleKey}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: "easeOut" }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-4xl">{icon}</span>
                  {t(titleKey)}
                </CardTitle>
                <CardDescription className="text-sm mt-3">
                  {t(descKey)}
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
