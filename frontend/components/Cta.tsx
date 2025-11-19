"use client"

import { Button } from "./ui/button";

export const Cta = () => {
  return (
    <section className="container py-24 sm:py-32">
      <div className="bg-muted rounded-lg p-8 md:p-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to take control of your finances?
        </h2>
        <p className="text-muted-foreground text-xl mb-8 max-w-2xl mx-auto">
          Join thousands of users who are already managing their money smarter with FinTrack.
        </p>
        <Button size="lg" className="text-lg">
          Get Started Free
        </Button>
      </div>
    </section>
  );
};

