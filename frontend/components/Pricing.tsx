"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Check, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { collection, addDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

const PRICE_IDS: Record<string, string | null> = {
  free: null,
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? null,
  business: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID ?? null,
}

export const Pricing = () => {
  const t = useTranslations("landing.pricing")
  const { user } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const plans = [
    {
      planKey: "free",
      featureKeys: ["feature1", "feature2", "feature3", "feature4", "feature5"],
      popular: false,
    },
    {
      planKey: "pro",
      featureKeys: ["feature1", "feature2", "feature3", "feature4", "feature5", "feature6"],
      popular: true,
    },
    {
      planKey: "business",
      featureKeys: ["feature1", "feature2", "feature3", "feature4"],
      popular: false,
    },
  ]

  const handleSubscribe = async (planKey: string) => {
    const priceId = PRICE_IDS[planKey]

    if (!priceId) {
      window.location.href = user ? "/dashboard" : "/auth/register"
      return
    }

    if (!user) {
      window.location.href = "/auth/register"
      return
    }

    setLoadingPlan(planKey)

    try {
      const checkoutSessionRef = collection(
        db,
        "customers",
        user.uid,
        "checkout_sessions"
      )

      const docRef = await addDoc(checkoutSessionRef, {
        price: priceId,
        success_url: `${window.location.origin}/dashboard?checkout=success`,
        cancel_url: `${window.location.origin}/?checkout=canceled`,
        allow_promotion_codes: true,
      })

      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data()
        if (data?.error) {
          console.error("Checkout session error:", data.error.message)
          setLoadingPlan(null)
          unsubscribe()
          return
        }
        if (data?.url) {
          window.location.assign(data.url)
          unsubscribe()
        }
      })
    } catch (error) {
      console.error("Error creating checkout session:", error)
      setLoadingPlan(null)
    }
  }

  return (
    <section id="pricing" className="container py-24 sm:py-32">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        {t("title")} <span className="text-foreground">{t("pricing")}</span>
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map(({ planKey, featureKeys, popular }) => (
          <Card key={planKey} className={popular ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {t(`${planKey}.name`)}
                {popular && (
                  <Badge variant="secondary" className="text-sm text-primary">
                    {t("mostPopular")}
                  </Badge>
                )}
              </CardTitle>
              <div>
                <span className="text-3xl font-bold">{t(`${planKey}.price`)}</span>
                <span className="text-muted-foreground">{t("perMonth")}</span>
              </div>
              <CardDescription>{t(`${planKey}.description`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => handleSubscribe(planKey)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === planKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("getStarted")}
                  </>
                ) : (
                  t("getStarted")
                )}
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <div className="space-y-2">
                {featureKeys.map((fKey) => (
                  <span key={fKey} className="flex items-center">
                    <Check className="text-green-500 mr-2" />
                    {t(`${planKey}.${fKey}`)}
                  </span>
                ))}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  )
}
