"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useTranslations } from "next-intl";

export const Testimonials = () => {
  const t = useTranslations("landing.testimonials");

  const testimonials = [
    { name: "John Doe", username: "@johndoe", contentKey: "testimonial1", avatar: "https://github.com/shadcn.png" },
    { name: "Jane Smith", username: "@janesmith", contentKey: "testimonial2", avatar: "https://github.com/shadcn.png" },
    { name: "Mike Johnson", username: "@mikej", contentKey: "testimonial3", avatar: "https://github.com/shadcn.png" },
  ];

  return (
    <section id="testimonials" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        {t("title")} <span className="text-foreground">{t("users")}</span> {t("say")}
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                  <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
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
        ))}
      </div>
    </section>
  );
};

