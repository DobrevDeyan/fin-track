"use client"

import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FeatureProps {
  title: string;
  description: string;
  icon: string;
}

const features: FeatureProps[] = [
  {
    title: "Manual Expense Categorization",
    description:
      "Manually track and categorize your expenses. Save time and get accurate insights into your spending patterns.",
    icon: "🤖",
  },
  {
    title: "Real-Time Analytics",
    description:
      "Track your spending patterns in real-time with beautiful charts and visualizations.",
    icon: "📊",
  },
  {
    title: "Budget Management",
    description:
      "Set budgets for different categories and get alerts when you're approaching your limits.",
    icon: "💰",
  },
];

export const Features = () => {
  return (
    <section id="features" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
        Powerful{" "}
        <span className="bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">
          Features
        </span>
      </h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map(({ title, description, icon }: FeatureProps) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-4xl">{icon}</span>
                {title}
              </CardTitle>
              <CardDescription className="text-lg mt-4">
                {description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
};

