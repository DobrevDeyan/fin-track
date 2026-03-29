"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SUPPORTED_CURRENCIES } from "@/lib/constants/currency.constants"
import { User, DollarSign, Euro, ArrowRight, Check } from "lucide-react"

interface OnboardingDialogProps {
  open: boolean
  onClose?: () => void
  onComplete: (data: { displayName: string; currency: string; monthlyBudget: number; salaryDate?: number }) => Promise<void>
}

export function OnboardingDialog({ open, onClose, onComplete }: OnboardingDialogProps) {
  const t = useTranslations("onboarding")
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState("")
  const [currency, setCurrency] = useState("")
  const [monthlyBudget, setMonthlyBudget] = useState("")
  const [salaryDate, setSalaryDate] = useState("")
  const [loading, setLoading] = useState(false)

  // Reset state each time the dialog opens
  useEffect(() => {
    if (open) {
      setStep(1)
      setDisplayName("")
      setCurrency("")
      setMonthlyBudget("")
      setSalaryDate("")
    }
  }, [open])

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
        salaryDate: salaryDate ? parseInt(salaryDate) : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return displayName.trim().length > 0
    if (step === 2) return currency !== ""
    if (step === 3) {
      if (!monthlyBudget || parseFloat(monthlyBudget) <= 0) return true // allow skip
      if (!salaryDate) return false
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
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose?.() }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 my-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-8 bg-primary" : s < step ? "w-8 bg-primary/40" : "w-8 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <User className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-center">{t("nameQuestion")}</h3>
            <Input
              placeholder={t("namePlaceholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
              autoFocus
            />
          </div>
        )}

        {/* Step 2: Currency */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <h3 className="text-lg font-semibold text-center">{t("currencyQuestion")}</h3>
            <div className="grid grid-cols-2 gap-4">
              {SUPPORTED_CURRENCIES.map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                    currency === curr
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  {currencyIcon(curr)}
                  <span className="font-semibold text-lg">{curr}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Monthly Salary & Date */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <h3 className="text-lg font-semibold text-center">What's your expected monthly salary?</h3>
            <p className="text-sm text-muted-foreground text-center">This helps track your budget and automate your income.</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                {currency === "USD" ? "$" : "€"}
              </span>
              <Input
                type="number"
                min="0"
                max="1000000"
                step="100"
                placeholder="2000"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="pl-8 text-lg"
                autoFocus
              />
            </div>
            {monthlyBudget && parseFloat(monthlyBudget) > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-sm font-medium">What day of the month do you receive it? (1–28)</p>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  placeholder="15"
                  value={salaryDate}
                  onChange={(e) => setSalaryDate(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && canProceed() && handleFinish()}
                  className="text-lg text-center"
                />
                {salaryDate !== "" && (parseInt(salaryDate) < 1 || parseInt(salaryDate) > 28) && (
                  <p className="text-xs text-red-500 text-center">Please enter a day between 1 and 28.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {step < 3 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
              {t("next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={!canProceed() || loading} className="gap-2">
              {loading ? t("saving") : (monthlyBudget ? t("finish") : "Skip & Finish")}
              {!loading && <Check className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
