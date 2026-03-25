"use client"

import { Zap, CloudOff, Bell, MoreHorizontal, Share, PlusSquare, Smartphone } from "lucide-react"
import { motion } from "framer-motion"

const features = [
  { icon: Zap, label: "Faster loading", desc: "Instant launch from your home screen" },
  { icon: CloudOff, label: "Works offline", desc: "Access your data without internet" },
  { icon: Bell, label: "Push notifications", desc: "Stay on top of your spending" },
]

const steps = [
  { num: 1, icon: MoreHorizontal, text: "Tap ··· at the bottom of your browser" },
  { num: 2, icon: Share, text: "Tap Share" },
  { num: 3, icon: PlusSquare, text: "Select 'Add to Home Screen' → 'Add'" },
]

export const InstallGuide = () => {
  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — text + features */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">
                Mobile App
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              Install Pocket on{" "}
              <span className="text-emerald-600">your phone</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-10">
              No app store needed. Add Pocket directly to your home screen for a native app experience — completely free.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-3 gap-4">
              {features.map(({ icon: Icon, label, desc }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl bg-background border border-border/50"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-semibold text-foreground leading-tight">{label}</span>
                  <span className="text-xs text-muted-foreground leading-snug hidden sm:block">{desc}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — step-by-step card (mimics the popup) */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-sm bg-background rounded-3xl border border-border/60 shadow-xl overflow-hidden">
              {/* Drag handle strip */}
              <div className="flex justify-center pt-4 pb-2 bg-muted/30">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/25" />
              </div>

              <div className="px-6 pt-4 pb-8">
                <p className="text-muted-foreground text-sm mb-1">Get the full experience</p>
                <h3 className="text-foreground text-xl font-bold mb-6">Install App</h3>

                {/* Mini features row */}
                <div className="flex justify-around mb-6">
                  {features.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
                      </div>
                      <span className="text-foreground/65 text-[10px] text-center font-medium leading-tight max-w-[60px]">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-border mb-5" />

                {/* Steps */}
                <div className="space-y-4 mb-7">
                  {steps.map(({ num, icon: Icon, text }, i) => (
                    <motion.div
                      key={num}
                      initial={{ opacity: 0, x: 12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <span className="text-white text-sm font-bold">{num}</span>
                      </div>
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                      <span className="text-foreground/80 text-sm">{text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="w-full py-3.5 rounded-2xl bg-foreground text-background font-semibold text-sm text-center">
                  Got it
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
