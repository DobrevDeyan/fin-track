"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
      .catch((err: any) => {
        const msg: string = err?.message ?? "Something went wrong."
        if (msg.includes("log in with that email")) {
          setStatus("wrong-email")
          setErrorMessage(msg)
        } else {
          setStatus("error")
          setErrorMessage(msg)
        }
      })
  }, [authLoading, user, token, status])

  if (!authLoading && !user) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
          <CardTitle>Family invite</CardTitle>
          <CardDescription>
            Sign in to accept this household invite. The invite will be applied automatically after you log in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            className="w-full"
            onClick={() =>
              router.push(
                `/auth/login?redirect=${encodeURIComponent(`/household/accept?token=${token}`)}`
              )
            }
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              router.push(
                `/auth/register?redirect=${encodeURIComponent(`/household/accept?token=${token}`)}`
              )
            }
          >
            Create an account
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
            ? `Joined ${householdName}`
            : status === "error" || status === "wrong-email"
            ? "Could not accept invite"
            : "Joining household…"}
        </CardTitle>

        <CardDescription>
          {status === "success" && "You now have access to the Family view. Switch to it from the dashboard."}
          {(status === "error" || status === "wrong-email") && errorMessage}
          {(status === "loading" || status === "idle") && "Please wait while we verify your invite."}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex justify-center">
        {status === "loading" || status === "idle" ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : status === "success" ? (
          <Button onClick={() => { window.location.href = "/dashboard" }}>
            Go to dashboard
          </Button>
        ) : (
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
