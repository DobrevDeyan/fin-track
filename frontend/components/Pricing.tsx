"use client"

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

export const Pricing = () => {
  const t = useTranslations("landing.pricing");

  const plans = [
    {
      planKey: "free",
      featureKeys: ["feature1", "feature2", "feature3"],
      popular: false,
    },
    {
      planKey: "pro",
      featureKeys: ["feature1", "feature2", "feature3", "feature4"],
      popular: true,
    },
    {
      planKey: "business",
      featureKeys: ["feature1", "feature2", "feature3", "feature4"],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        {t("title")} <span className="text-foreground">{t("pricing")}</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map(({ planKey, featureKeys, popular }) => (
          <Card key={planKey} className={popular ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t(`${planKey}.name`)}
                {popular && (
                  <Badge variant="secondary" className="text-sm text-primary">
                    {t("mostPopular")}
                  </Badge>
                )}
              </CardTitle>
              <div>
                <span className="text-3xl font-bold">{t(`${planKey}.price`)}</span>
                <span className="text-muted-foreground">{t("perMonth")}</span>
              </div>
              <CardDescription>{t(`${planKey}.description`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">{t("getStarted")}</Button>
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <div className="space-y-2">
                {featureKeys.map((fKey) => (
                  <span key={fKey} className="flex items-center">
                    <Check className="text-green-500 mr-2" />
                    {t(`${planKey}.${fKey}`)}
                  </span>
                ))}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
};

