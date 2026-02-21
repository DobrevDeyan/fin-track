"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import Typed from "typed.js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SUPPORTED_CURRENCIES } from "@/lib/constants/currency.constants"
import { User, DollarSign, Euro, ArrowRight, Check } from "lucide-react"

interface OnboardingScreenProps {
  onComplete: (data: { displayName: string; currency: string; monthlyBudget: number; salaryDate?: number }) => Promise<void>
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const t = useTranslations("onboarding")
  const typedEl = useRef<HTMLSpanElement>(null)
  
  const [phase, setPhase] = useState<"greeting" | "form">("greeting")
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState("")
  const [currency, setCurrency] = useState("")
  const [monthlyBudget, setMonthlyBudget] = useState("")
  const [salaryDate, setSalaryDate] = useState("")
  const [loading, setLoading] = useState(false)

  // Typing effect
  useEffect(() => {
    if (phase !== "greeting") return

    const typed = new Typed(typedEl.current, {
      strings: [t("greeting"), "Smart Financial Management Made Easy"],
      typeSpeed: 50,
      backSpeed: 30,
      backDelay: 1500,
      loop: false,
      onComplete: () => {
        setTimeout(() => {
          setPhase("form")
        }, 1000)
      }
    })

    return () => {
      typed.destroy()
    }
  }, [phase, t])

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      await onComplete({
        displayName: displayName.trim(),
        currency,
        monthlyBudget: parseFloat(monthlyBudget) || 0,
        salaryDate: parseInt(salaryDate) || undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return displayName.trim().length > 0
    if (step === 2) return currency !== ""
    if (step === 3) {
      if (monthlyBudget === "") return true // Allow skip
      const day = parseInt(salaryDate)
      return !isNaN(day) && day >= 1 && day <= 28
    }
    return false
  }

  const currencyIcon = (curr: string) => {
    if (curr === "USD") return <DollarSign className="h-6 w-6" />
    return <Euro className="h-6 w-6" />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="w-full max-w-lg p-6 flex flex-col items-center">
        
        {phase === "greeting" && (
          <div className="text-4xl md:text-5xl font-bold text-slate-900 text-center min-h-[4rem]">
            <span ref={typedEl} />
          </div>
        )}

        {phase === "form" && (
          <div className="w-full space-y-8 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t("title")}</h2>
              <p className="text-slate-500">{t("subtitle")}</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === step ? "w-10 bg-primary" : s < step ? "w-10 bg-primary/40" : "w-10 bg-slate-100"
                  }`}
                />
              ))}
            </div>

            {/* Step 1: Name */}
            {step === 1 && (
              <div className="space-y-6 py-4 transition-all duration-300">
                <div className="flex items-center justify-center">
                  <div className="rounded-full bg-primary/5 p-6 border border-primary/10">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-center text-slate-800">{t("nameQuestion")}</h3>
                  <Input
                    placeholder={t("namePlaceholder")}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                    className="h-12 text-lg text-center bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Step 2: Currency */}
            {step === 2 && (
              <div className="space-y-6 py-4 animate-in slide-in-from-right duration-300">
                <h3 className="text-xl font-semibold text-center text-slate-800">{t("currencyQuestion")}</h3>
                <div className="grid grid-cols-2 gap-6">
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setCurrency(curr)}
                      className={`flex flex-col items-center gap-3 p-8 rounded-2xl border-2 transition-all duration-200 ${
                        currency === curr
                          ? "border-primary bg-primary/5 shadow-lg scale-105"
                          : "border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className={`${currency === curr ? "text-primary" : "text-slate-400"}`}>
                        {currencyIcon(curr)}
                      </div>
                      <span className={`font-bold text-xl ${currency === curr ? "text-primary" : "text-slate-600"}`}>
                        {curr}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Expected Salary & Date */}
            {step === 3 && (
              <div className="space-y-6 py-4 animate-in slide-in-from-right duration-300">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-slate-800">What's your expected monthly salary?</h3>
                  <p className="text-slate-500">This helps track your budget and automate your income.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl transition-colors group-focus-within:text-primary">
                      {currency === "USD" ? "$" : "€"}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="2000"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(e.target.value)}
                      className="pl-10 h-14 text-2xl font-semibold bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                      autoFocus
                    />
                  </div>

                  {monthlyBudget && parseFloat(monthlyBudget) > 0 && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-2 pt-2">
                       <h4 className="text-sm font-medium text-slate-700">What day of the month do you receive it? (1-28)</h4>
                       <Input
                         type="number"
                         min="1"
                         max="28"
                         placeholder="15"
                         value={salaryDate}
                         onChange={(e) => setSalaryDate(e.target.value)}
                         onKeyDown={(e) => e.key === "Enter" && canProceed() && handleFinish()}
                         className="h-12 text-lg text-center bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                       />
                       {salaryDate !== "" && (parseInt(salaryDate) < 1 || parseInt(salaryDate) > 28) && (
                         <p className="text-xs text-red-500 text-center">Please enter a day between 1 and 28.</p>
                       )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center pt-8">
              {step < 3 ? (
                <Button 
                  onClick={handleNext} 
                  disabled={!canProceed()} 
                  className="w-full h-12 rounded-xl text-lg font-semibold gap-2 transition-all active:scale-95"
                >
                  {t("next")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  onClick={handleFinish} 
                  disabled={!canProceed() || loading} 
                  className="w-full h-12 rounded-xl text-lg font-semibold gap-2 transition-all active:scale-95"
                >
                  {loading ? t("saving") : (monthlyBudget ? t("finish") : "Skip & Finish")}
                  {!loading && <Check className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
