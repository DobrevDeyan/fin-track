"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export const Testimonials = () => {
  const t = useTranslations("landing.testimonials");

  const testimonials = [
    { name: "Maria K.", username: "@mariak", contentKey: "testimonial1", initials: "MK" },
    { name: "Thomas R.", username: "@thomasr", contentKey: "testimonial2", initials: "TR" },
    { name: "Elena V.", username: "@elenav", contentKey: "testimonial3", initials: "EV" },
  ];

  return (
    <section id="testimonials" className="container py-24 sm:py-32">
      <motion.h2
        className="text-3xl md:text-4xl font-bold text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {t("title")} <span className="text-foreground">{t("users")}</span> {t("say")}
      </motion.h2>
      <div className="grid md:grid-cols-3 gap-8">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={testimonial.name}
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: "easeOut" }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{testimonial.username}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p>{t(testimonial.contentKey)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
