"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { callAcceptHouseholdInvite } from "@/lib/firestore-household"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, CheckCircle2, XCircle } from "lucide-react"

type Status = "idle" | "loading" | "success" | "error" | "wrong-email"

export function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const t = useTranslations("household.accept")

  const token = searchParams.get("token")

  const [status, setStatus] = useState<Status>("idle")
  const [householdName, setHouseholdName] = useState<string>("")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    if (authLoading || !user || !token || status !== "idle") return

    setStatus("loading")

    callAcceptHouseholdInvite(token)
      .then((result) => {
        setHouseholdName(result.data.householdName)
        setStatus("success")
      })
      .catch((err: unknown) => {
        // Prefer the machine-readable reason from the Cloud Function (H7-3) over
        // string-matching the English message.
        const details = (err as { details?: { reason?: string; invitedEmail?: string } })?.details
        if (details?.reason === "wrong_email") {
          setStatus("wrong-email")
          setErrorMessage(t("wrongEmail", { email: details.invitedEmail ?? "" }))
        } else {
          setStatus("error")
          const msg = (err as { message?: string })?.message
          setErrorMessage(msg || t("genericError"))
        }
      })
  }, [authLoading, user, token, status, t])

  if (!authLoading && !user) {
    const returnUrl = encodeURIComponent(`/household/accept?token=${token ?? ""}`)
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
          <CardTitle>{t("familyInvite")}</CardTitle>
          <CardDescription>{t("signInPrompt")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            className="w-full"
            onClick={() => router.push(`/auth/login?returnUrl=${returnUrl}`)}
          >
            {t("signIn")}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push(`/auth/register?returnUrl=${returnUrl}`)}
          >
            {t("createAccount")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {status === "success" ? (
          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
        ) : status === "error" || status === "wrong-email" ? (
          <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
        ) : (
          <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
        )}

        <CardTitle>
          {status === "success"
            ? t("joinedTitle", { name: householdName })
            : status === "error" || status === "wrong-email"
            ? t("couldNotAccept")
            : t("joiningTitle")}
        </CardTitle>

        <CardDescription>
          {status === "success" && t("successDescription")}
          {(status === "error" || status === "wrong-email") && errorMessage}
          {(status === "loading" || status === "idle") && t("verifying")}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex justify-center">
        {status === "loading" || status === "idle" ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : status === "success" ? (
          <Button onClick={() => { window.location.href = "/dashboard" }}>
            {t("goToDashboard")}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            {t("backToDashboard")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
