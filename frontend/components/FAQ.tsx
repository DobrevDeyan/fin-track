"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQ = () => {
  const faqs = [
    {
      question: "How does AI categorization work?",
      answer: "You can manually categorize your expenses when adding them. Simply select the appropriate category for each entry to keep your finances organized.",
    },
    {
      question: "Is my financial data secure?",
      answer: "Yes, we use bank-level encryption to protect your data. All your entries are stored securely and encrypted in transit and at rest.",
    },
    {
      question: "Can I use FinTrack on mobile?",
      answer: "Yes, FinTrack is available as a Progressive Web App (PWA) that works on all mobile devices.",
    },
    {
      question: "What happens if I exceed my free tier limits?",
      answer: "FinTrack is currently free to use. All features are available to help you track and manage your finances.",
    },
  ];

  return (
    <section id="faq" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Frequently Asked <span className="text-foreground">Questions</span>
      </h2>
      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

