"use client"

import { LogoIcon } from "./Icons";

export const Footer = () => {
  return (
    <footer id="footer" className="border-t">
      <hr className="w-11/12 mx-auto" />

      <section className="container py-20 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-12 gap-y-8">
        <div className="col-span-full xl:col-span-2">
          <a
            rel="noreferrer noopener"
            href="/"
            className="font-bold text-xl flex"
          >
            <LogoIcon />
            FinTrack
          </a>
          <p className="text-muted-foreground mt-4">
            Smart financial management made easy.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">Product</h3>
          <a href="#features" className="opacity-60 hover:opacity-100">Features</a>
          <a href="#pricing" className="opacity-60 hover:opacity-100">Pricing</a>
          <a href="#faq" className="opacity-60 hover:opacity-100">FAQ</a>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">Company</h3>
          <a href="#about" className="opacity-60 hover:opacity-100">About</a>
          <a href="#team" className="opacity-60 hover:opacity-100">Team</a>
          <a href="#contact" className="opacity-60 hover:opacity-100">Contact</a>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-bold text-lg">Legal</h3>
          <a href="#" className="opacity-60 hover:opacity-100">Privacy</a>
          <a href="#" className="opacity-60 hover:opacity-100">Terms</a>
        </div>
      </section>

      <section className="container pb-14 text-center">
        <h3>
          &copy; {new Date().getFullYear()} FinTrack. All rights reserved.
        </h3>
      </section>
    </footer>
  );
};

