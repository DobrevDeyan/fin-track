"use client"

import { Input } from "./ui/input";
import { Button } from "./ui/button";

export const Newsletter = () => {
  return (
    <section className="container py-24 sm:py-32">
      <div className="bg-muted rounded-lg p-8 md:p-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Stay Updated
        </h2>
        <p className="text-muted-foreground text-xl mb-8 max-w-2xl mx-auto">
          Subscribe to our newsletter to get the latest updates and financial tips.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <Input type="email" placeholder="Enter your email" className="flex-1" />
          <Button>Subscribe</Button>
        </div>
      </div>
    </section>
  );
};

