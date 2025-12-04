import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Sponsors } from "@/components/Sponsors";

// Lazy load below-the-fold components for better initial page load
const About = dynamic(() => import("@/components/About").then(mod => ({ default: mod.About })), {
  loading: () => <div className="min-h-[400px]" />,
});
const HowItWorks = dynamic(() => import("@/components/HowItWorks").then(mod => ({ default: mod.HowItWorks })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Features = dynamic(() => import("@/components/Features").then(mod => ({ default: mod.Features })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Services = dynamic(() => import("@/components/Services").then(mod => ({ default: mod.Services })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Cta = dynamic(() => import("@/components/Cta").then(mod => ({ default: mod.Cta })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Testimonials = dynamic(() => import("@/components/Testimonials").then(mod => ({ default: mod.Testimonials })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Team = dynamic(() => import("@/components/Team").then(mod => ({ default: mod.Team })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Pricing = dynamic(() => import("@/components/Pricing").then(mod => ({ default: mod.Pricing })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Newsletter = dynamic(() => import("@/components/Newsletter").then(mod => ({ default: mod.Newsletter })), {
  loading: () => <div className="min-h-[400px]" />,
});
const FAQ = dynamic(() => import("@/components/FAQ").then(mod => ({ default: mod.FAQ })), {
  loading: () => <div className="min-h-[400px]" />,
});
const Footer = dynamic(() => import("@/components/Footer").then(mod => ({ default: mod.Footer })), {
  loading: () => <div className="min-h-[200px]" />,
});
const ScrollToTop = dynamic(() => import("@/components/ScrollToTop").then(mod => ({ default: mod.ScrollToTop })));

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Sponsors />
      <About />
      <HowItWorks />
      <Features />
      <Services />
      <Cta />
      <Testimonials />
      <Team />
      <Pricing />
      <Newsletter />
      <FAQ />
      <Footer />
      <ScrollToTop />
    </>
  );
}

