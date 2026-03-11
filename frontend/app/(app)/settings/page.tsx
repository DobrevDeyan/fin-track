"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { deleteUserData } from "@/lib/firestore-users"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, CreditCard, Trash2, User } from "lucide-react"
import { BillingPortalButton } from "@/components/BillingPortalButton"

export default function SettingsPage() {
  const t = useTranslations("settings")
  const { user } = useAuth()
  const router = useRouter()
  const { tier, subscription, loading: subscriptionLoading } = useSubscription()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (!user) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteUserData(user.uid)
      // Auth account deleted — redirect to login
      router.push("/auth/login")
    } catch (err: any) {
      console.error("Account deletion failed:", err)
      setDeleteError(t("deleteAccountError"))
      setDeleting(false)
    }
  }

  const isConfirmValid = confirmText.trim() === "DELETE"

  if (!user) return null

  const tierLabel = tier === "free" ? t("billing.freePlan") : tier === "pro" ? t("billing.proPlan") : t("billing.businessPlan")

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Profile summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            {t("profile")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t("email")}</Label>
            <p className="text-sm font-medium mt-0.5">{user.email}</p>
          </div>
          {user.displayName && (
            <div>
              <Label className="text-xs text-muted-foreground">{t("displayName")}</Label>
              <p className="text-sm font-medium mt-0.5">{user.displayName}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            {t("billing.title")}
          </CardTitle>
          <CardDescription>{t("billing.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {t("billing.currentPlan")}: {subscriptionLoading ? "..." : tierLabel}
            </p>
            {subscription?.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subscription.cancelAtPeriodEnd
                  ? t("billing.expiresOn", { date: subscription.currentPeriodEnd.toLocaleDateString() })
                  : t("billing.renewsOn", { date: subscription.currentPeriodEnd.toLocaleDateString() })}
              </p>
            )}
          </div>
          {tier !== "free" && <BillingPortalButton label={t("billing.manageBilling")} />}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t("dangerZone")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t("deleteAccount")}</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                {t("deleteAccountDescription")}
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="shrink-0 flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("deleteAccount")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!deleting) {
          setDeleteDialogOpen(open)
          if (!open) {
            setConfirmText("")
            setDeleteError(null)
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("deleteAccountConfirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("deleteAccountConfirmDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t("deleteAccountConfirmPlaceholder")}
              disabled={deleting}
              className="font-mono"
            />
            {deleteError && (
              <p className="text-sm text-destructive mt-2">{deleteError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setConfirmText("")
                setDeleteError(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!isConfirmValid || deleting}
            >
              {deleting ? t("deleting") : t("deleteAccountConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
