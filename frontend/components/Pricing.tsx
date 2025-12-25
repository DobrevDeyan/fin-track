"use client"

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Check } from "lucide-react";

export const Pricing = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      features: ["100 transactions/month", "Basic categorization", "Mobile app access"],
      popular: false,
    },
    {
      name: "Pro",
      price: "$9.99",
      description: "For power users",
      features: ["Unlimited transactions", "AI categorization", "Advanced analytics", "Budget alerts"],
      popular: true,
    },
    {
      name: "Business",
      price: "$29.99",
      description: "For teams",
      features: ["Everything in Pro", "Multi-user accounts", "Team collaboration", "API access"],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Simple <span className="text-foreground">Pricing</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.popular ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan.name}
                {plan.popular && (
                  <Badge variant="secondary" className="text-sm text-primary">
                    Most popular
                  </Badge>
                )}
              </CardTitle>
              <div>
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground"> /month</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Get Started</Button>
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <div className="space-y-2">
                {plan.features.map((feature) => (
                  <span key={feature} className="flex items-center">
                    <Check className="text-green-500 mr-2" />
                    {feature}
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

