"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export const Testimonials = () => {
  const testimonials = [
    {
      name: "John Doe",
      username: "@johndoe",
      content: "Pocket has completely changed how I manage my finances. The AI categorization is incredibly accurate!",
      avatar: "https://github.com/shadcn.png",
    },
    {
      name: "Jane Smith",
      username: "@janesmith",
      content: "I love the real-time analytics. It helps me stay on top of my spending habits.",
      avatar: "https://github.com/shadcn.png",
    },
    {
      name: "Mike Johnson",
      username: "@mikej",
      content: "The budget alerts are a game-changer. I've saved so much money since using Pocket!",
      avatar: "https://github.com/shadcn.png",
    },
  ];

  return (
    <section id="testimonials" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        What Our <span className="text-foreground">Users</span> Say
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
              <p>{testimonial.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

