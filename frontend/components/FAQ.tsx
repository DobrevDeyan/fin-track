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
      answer: "Our AI uses machine learning to analyze transaction descriptions and automatically assign them to categories based on patterns from millions of transactions.",
    },
    {
      question: "Is my financial data secure?",
      answer: "Yes, we use bank-level encryption and never store your banking credentials. All data is encrypted in transit and at rest.",
    },
    {
      question: "Can I use FinTrack on mobile?",
      answer: "Yes, FinTrack is available as a Progressive Web App (PWA) that works on all mobile devices.",
    },
    {
      question: "What happens if I exceed my free tier limits?",
      answer: "You can upgrade to Pro at any time to get unlimited transactions and advanced features.",
    },
  ];

  return (
    <section id="faq" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Frequently Asked <span className="bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">Questions</span>
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

