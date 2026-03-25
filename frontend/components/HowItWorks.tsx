"use client"

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export const HowItWorks = () => {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    { number: "1", titleKey: "step1Title", descKey: "step1Desc" },
    { number: "2", titleKey: "step2Title", descKey: "step2Desc" },
    { number: "3", titleKey: "step3Title", descKey: "step3Desc" },
    { number: "4", titleKey: "step4Title", descKey: "step4Desc" },
    { number: "5", titleKey: "step5Title", descKey: "step5Desc" },
  ];

  return (
    <section id="how-it-works" className="container py-24 sm:py-32">
      <motion.h2
        className="text-2xl md:text-3xl font-bold text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {t("title")} <span className="text-foreground">{t("works")}</span>
      </motion.h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            className="text-center"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: index * 0.1, ease: "easeOut" }}
          >
            <motion.div
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 + 0.1, type: "spring", stiffness: 260, damping: 20 }}
            >
              <span className="text-2xl font-bold text-primary">{step.number}</span>
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">{t(step.titleKey)}</h3>
            <p className="text-muted-foreground">{t(step.descKey)}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

