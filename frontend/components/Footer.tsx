"use client"

import Link from "next/link";
import { LogoIcon } from "./Icons";

export const Footer = () => {
  return (
    <footer id="footer" className="border-t border-border bg-background">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Left side - Logo and Company Info */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4"
            >
              <div className="w-10 h-10 rounded-md bg-black flex items-center justify-center">
                <span className="text-white font-bold text-lg">FT</span>
              </div>
              <span className="font-semibold text-xl text-foreground">
                FinTrack
              </span>
            </Link>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">FinTrack</p>
              <p>Smart financial management made easy.</p>
              <p className="mt-4">
                The interactive layer for your
                <br />
                financial tracking and budgeting.
              </p>
              <p className="mt-6 text-xs">
                &copy; {new Date().getFullYear()} FinTrack
              </p>
            </div>
          </div>

          {/* Product Column */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-foreground">Product</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="#faq"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                FAQ
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Solutions Column */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-foreground">Solutions</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Personal Finance
              </Link>
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Budget Tracking
              </Link>
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Expense Management
              </Link>
            </div>
          </div>

          {/* Resources Column */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-foreground">Resources</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Blog
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Support
              </Link>
            </div>
          </div>

          {/* Company Column */}
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm text-foreground">Company</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="#about"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </Link>
              <Link
                href="#contact"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Security & Compliance
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

