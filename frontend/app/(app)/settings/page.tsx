"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@/contexts/AuthContext"
import { useCurrency } from "@/contexts/CurrencyContext"
import { deleteUserData, resetFinancialData, updateUserDisplayName } from "@/lib/firestore-users"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Bell, BellOff, Check, CheckCircle2, Circle, Copy, CreditCard, Loader2, Palette, Pencil, RotateCcw, Trash2, Trophy, User, UserPlus, Users, Wand2 } from "lucide-react"
import { useHousehold } from "@/contexts/HouseholdContext"
import {
  callCreateHousehold,
  callSendHouseholdInvite,
  callLeaveHousehold,
} from "@/lib/firestore-household"
import { setLeaderboardOptIn } from "@/lib/firestore-leaderboard"
import { collection, addDoc, doc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { ThemeControls } from "@/components/ThemeControls"
import { BillingPortalButton } from "@/components/BillingPortalButton"
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog"
import { completeOnboarding } from "@/lib/firestore-users"
import { useScanQuota } from "@/lib/hooks/useScanQuota"
import { useNotifications } from "@/lib/hooks/useNotifications"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? null

const PRO_FEATURES = [
  "Unlimited transactions",
  "30 receipt scans / month",
  "AI Monthly Summary & Budget Coach",
  "90-day Cash Flow Forecast",
  "PDF & CSV export",
  "Unlimited budgets, goals & accounts",
]

export default function SettingsPage() {
  const t = useTranslations("settings")
  const { user } = useAuth()
  const router = useRouter()
  const { tier, subscription, loading: subscriptionLoading } = useSubscription()
  const { refreshCurrency } = useCurrency()
  const { count: scanCount, limit: scanLimit, resetAt: scanResetAt } = useScanQuota()

  // Display name editing
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(user?.displayName ?? "")
  const [savingName, setSavingName] = useState(false)

  // Keep nameValue in sync when Firebase Auth user object updates (e.g. after setup wizard)
  useEffect(() => {
    if (!editingName) setNameValue(user?.displayName ?? "")
  }, [user?.displayName, editingName])

  // Stripe upgrade
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Reset financial data
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState("")
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // Setup wizard
  const [setupWizardOpen, setSetupWizardOpen] = useState(false)
  const { permission: notifPermission, enable: enableNotifications, isSupported: notifSupported } = useNotifications()
  const [notifLoading, setNotifLoading] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
    setIsIos(ios)
    setIsStandalone(standalone)
  }, [])

  // Leaderboard opt-in
  const [leaderboardOptIn, setLeaderboardOptInState] = useState(false)
  const [leaderboardToggling, setLeaderboardToggling] = useState(false)
  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      setLeaderboardOptInState(snap.data()?.leaderboardOptIn === true)
    })
    return unsub
  }, [user])

  const handleLeaderboardToggle = async () => {
    if (!user || leaderboardToggling) return
    setLeaderboardToggling(true)
    try {
      await setLeaderboardOptIn(user.uid, !leaderboardOptIn)
    } catch {
      toast.error("Failed to update leaderboard preference.")
    } finally {
      setLeaderboardToggling(false)
    }
  }

  // Household
  const {
    household,
    householdId,
    loading: householdLoading,
    refreshHouseholdEntries,
    refreshHousehold,
  } = useHousehold()
  const [householdName, setHouseholdName] = useState("")
  const [creatingHousehold, setCreatingHousehold] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [leavingHousehold, setLeavingHousehold] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)

  const handleCreateHousehold = async () => {
    if (!user) return
    setCreatingHousehold(true)
    try {
      await callCreateHousehold(householdName.trim() || "My Family")
      toast.success("Household created!")
      setHouseholdName("")
      // Force a page reload so HouseholdContext re-reads the user doc
      window.location.reload()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create household.")
    } finally {
      setCreatingHousehold(false)
    }
  }

  const handleSendInvite = async () => {
    if (!user || !householdId || !inviteEmail.trim()) return
    setSendingInvite(true)
    setInviteLink(null)
    try {
      const result = await callSendHouseholdInvite(householdId, inviteEmail.trim())
      console.log(result, 21321323)
      const link = `${window.location.origin}/household/accept?token=${result.data.token}`
      setInviteLink(link)
      setInviteEmail("")
      toast.success("Invite link generated — copy and share it.")
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate invite.")
    } finally {
      setSendingInvite(false)
    }
  }

  const handleLeaveHousehold = async () => {
    if (!user || !householdId) return
    setLeavingHousehold(true)
    try {
      await callLeaveHousehold(householdId)
      toast.success("You left the household.")
      setLeaveDialogOpen(false)
      window.location.reload()
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to leave household.")
    } finally {
      setLeavingHousehold(false)
    }
  }

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleSaveName = async () => {
    if (!user || !nameValue.trim()) return
    setSavingName(true)
    try {
      await updateUserDisplayName(user.uid, nameValue.trim())
      toast.success("Display name updated.")
      setEditingName(false)
    } catch {
      toast.error("Failed to update display name. Please try again.")
    } finally {
      setSavingName(false)
    }
  }

  const handleResetFinancialData = async () => {
    if (!user) return
    setResetting(true)
    setResetError(null)
    try {
      await resetFinancialData(user.uid)
      await httpsCallable(functions, "deleteMyNotifications")()
      setResetDialogOpen(false)
      setResetConfirmText("")
      toast.success("All financial data has been reset.")
      window.location.reload()
    } catch (err: any) {
      console.error("Reset failed:", err)
      setResetError("Reset failed. Please try again.")
      setResetting(false)
    }
  }

  const handleUpgradeToPro = async () => {
    if (!user) {
      window.location.href = "/auth/register"
      return
    }
    if (!PRO_PRICE_ID || PRO_PRICE_ID.startsWith("price_REPLACE_")) {
      toast.error("Upgrade is not available yet. Please try again later.")
      return
    }

    setCheckoutLoading(true)
    try {
      const checkoutSessionRef = collection(db, "customers", user.uid, "checkout_sessions")
      const docRef = await addDoc(checkoutSessionRef, {
        price: PRO_PRICE_ID,
        success_url: `${window.location.origin}/settings?checkout=success`,
        cancel_url: `${window.location.origin}/settings`,
        allow_promotion_codes: true,
      })

      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data()
        if (data?.error) {
          clearTimeout(timeout)
          toast.error("Failed to start checkout. Please try again.")
          setCheckoutLoading(false)
          unsubscribe()
          return
        }
        if (data?.url) {
          clearTimeout(timeout)
          window.location.assign(data.url)
          unsubscribe()
        }
      })

      const timeout = setTimeout(() => {
        unsubscribe()
        setCheckoutLoading(false)
        toast.error("Checkout is taking too long. Please try again.")
      }, 30_000)
    } catch {
      toast.error("Could not create checkout session. Please try again.")
      setCheckoutLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteUserData(user.uid)
      router.push("/auth/login")
    } catch (err: any) {
      console.error("Account deletion failed:", err)
      setDeleteError(t("deleteAccountError"))
      setDeleting(false)
    }
  }

  const isConfirmValid = confirmText.trim() === "DELETE"

  if (!user) return null

  const tierLabel =
    tier === "free"
      ? t("billing.freePlan")
      : tier === "pro"
      ? t("billing.proPlan")
      : t("billing.businessPlan")

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Appearance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </CardTitle>
          <CardDescription>
            Choose your theme and accent color. Changes apply instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeControls />
        </CardContent>
      </Card>

      {/* Setup Wizard */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4" />
            Setup Wizard
          </CardTitle>
          <CardDescription>
            Revisit your name, currency, and monthly budget at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => setSetupWizardOpen(true)}>
            <Wand2 className="h-4 w-4 mr-2" />
            Rerun setup wizard
          </Button>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      {notifSupported && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Get alerted when you exceed a budget, reach a savings goal, or have important updates.
              {" "}Works on Android and on iOS 16.4+ when the app is added to your home screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifPermission === "granted" ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Notifications are enabled
              </div>
            ) : notifPermission === "denied" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BellOff className="h-4 w-4" />
                Blocked by browser — enable them in your browser site settings, then reload.
              </div>
            ) : isIos && !isStandalone ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Bell className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    On iPhone/iPad, push notifications only work when the app is installed.
                    Tap <strong>Share → Add to Home Screen</strong> in Safari, then open the app from your home screen and enable notifications here.
                  </span>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={notifLoading}
                onClick={async () => {
                  setNotifLoading(true)
                  await enableNotifications()
                  setNotifLoading(false)
                }}
              >
                {notifLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Enable notifications
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Community Leaderboard */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Community Leaderboard
          </CardTitle>
          <CardDescription>
            Opt in to share your anonymous financial health score with the community.
            Your name, email, income, and spending details are <strong>never shared</strong> — only an opaque score and a random handle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="sm"
            variant={leaderboardOptIn ? "outline" : "default"}
            disabled={leaderboardToggling}
            onClick={handleLeaderboardToggle}
            className="gap-2"
          >
            {leaderboardToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : leaderboardOptIn ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            {leaderboardOptIn ? "Opted in — click to opt out" : "Include my score in community stats"}
          </Button>
          {leaderboardOptIn && (
            <p className="text-xs text-muted-foreground mt-2">
              Your score is included in the monthly aggregation. Opt out anytime to delete it immediately.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Family / Household */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Family Budgeting
          </CardTitle>
          <CardDescription>
            Share your financial view with a partner or family member. Each person keeps their own account — you just see a merged view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {householdLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : household ? (
            <>
              {/* Existing household */}
              <div className="rounded-md bg-muted/50 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{household.name}</p>
                  <button
                    onClick={() => refreshHousehold()}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title="Refresh member list"
                  >
                    ↻ Refresh
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {household.members.length} member{household.members.length !== 1 ? "s" : ""}
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  {household.members.map((m) => (
                    <li key={m.uid} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      {m.displayName} {m.uid === user?.uid ? "(you)" : ""}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Invite form */}
              <div className="space-y-2">
                <Label className="text-xs">Invite a family member</Label>
                <p className="text-xs text-muted-foreground">
                  Enter their email, generate an invite link, then send it to them however you like.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="partner@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendInvite() }}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={sendingInvite || !inviteEmail.trim()}
                    onClick={handleSendInvite}
                  >
                    {sendingInvite ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-1" />
                    )}
                    Generate link
                  </Button>
                </div>
                {inviteLink && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Share this link with your family member:</p>
                    <div className="flex items-center gap-2 rounded-md border p-2 text-xs bg-muted">
                      <span className="truncate flex-1 text-muted-foreground">{inviteLink}</span>
                      <button
                        className="shrink-0 hover:text-foreground"
                        title="Copy link"
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink)
                          toast.success("Link copied!")
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <a
                      href={`mailto:?subject=Join my household on Pocket&body=Hi! I'd like to invite you to join my household on Pocket. Click this link to accept: ${encodeURIComponent(inviteLink)}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <UserPlus className="h-3 w-3" />
                      Send via email app
                    </a>
                  </div>
                )}
              </div>

              {/* Leave household */}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setLeaveDialogOpen(true)}
              >
                Leave household
              </Button>
            </>
          ) : (
            /* No household yet — create one */
            <div className="space-y-2">
              <Label className="text-xs">Household name (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="My Family"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  disabled={creatingHousehold}
                  onClick={handleCreateHousehold}
                >
                  {creatingHousehold ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Or accept an invite link from a family member to join their household.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave household confirmation dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave household?</DialogTitle>
            <DialogDescription>
              You will lose access to the Family view. Your personal transactions are not affected.
              {household?.ownerUid === user?.uid && household && household.members.length > 1 && (
                <span className="block mt-1 text-amber-600">
                  Ownership will transfer to another member.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={leavingHousehold}
              onClick={handleLeaveHousehold}
            >
              {leavingHousehold ? <Loader2 className="h-4 w-4 animate-spin" /> : "Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            {t("profile")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">{t("email")}</Label>
            <p className="text-sm font-medium mt-0.5">{user.email}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t("displayName")}</Label>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName()
                    if (e.key === "Escape") setEditingName(false)
                  }}
                  className="h-8 text-sm max-w-xs"
                  autoFocus
                  disabled={savingName}
                />
                <Button size="sm" onClick={handleSaveName} disabled={savingName || !nameValue.trim()}>
                  {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNameValue(user.displayName ?? "") }} disabled={savingName}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-medium">{user.displayName || <span className="text-muted-foreground italic">Not set</span>}</p>
                <button
                  onClick={() => { setNameValue(user.displayName ?? ""); setEditingName(true) }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Edit display name"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card id="billing" className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            {t("billing.title")}
          </CardTitle>
          <CardDescription>{t("billing.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current plan row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {t("billing.currentPlan")}: {subscriptionLoading ? "..." : tierLabel}
                </p>
                <Badge variant={tier === "free" ? "secondary" : "default"} className="text-xs">
                  {subscriptionLoading ? "..." : tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Badge>
              </div>
              {subscription?.currentPeriodEnd && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subscription.cancelAtPeriodEnd
                    ? t("billing.expiresOn", { date: subscription.currentPeriodEnd.toLocaleDateString() })
                    : t("billing.renewsOn", { date: subscription.currentPeriodEnd.toLocaleDateString() })}
                </p>
              )}
            </div>
            {tier !== "free" && (
              <div className="flex flex-col items-start sm:items-end gap-1">
                <BillingPortalButton label={t("billing.manageBilling")} />
                <p className="text-xs text-muted-foreground">Update payment, view invoices, or cancel</p>
              </div>
            )}
          </div>

          {/* Cancellation notice */}
          {subscription?.cancelAtPeriodEnd && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-500">Cancellation scheduled</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your Pro access will end on {subscription.currentPeriodEnd?.toLocaleDateString()}. Click &quot;Manage Billing&quot; to reactivate.
                </p>
              </div>
            </div>
          )}

          {/* Scan quota for paid users */}
          {tier !== "free" && scanLimit > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Receipt scans this month</span>
                <span>{scanCount} / {scanLimit}</span>
              </div>
              <Progress value={(scanCount / scanLimit) * 100} className="h-2" />
              {scanResetAt && (
                <p className="text-xs text-muted-foreground">Resets on {scanResetAt.toLocaleDateString()}</p>
              )}
            </div>
          )}

          {/* Inline upgrade card for free users */}
          {!subscriptionLoading && tier === "free" && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Upgrade to Pro</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Unlock AI features and unlimited tracking</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-bold">€7.99</span>
                  <span className="text-xs text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full sm:w-auto" onClick={handleUpgradeToPro} disabled={checkoutLoading}>
                {checkoutLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up checkout...</>
                ) : (
                  "Upgrade to Pro — €7.99/month"
                )}
              </Button>
            </div>
          )}
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
        <CardContent className="space-y-4">
          {/* Reset financial data */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/50">
            <div>
              <p className="text-sm font-medium">Reset financial data</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                Permanently delete all transactions, budgets, goals, savings accounts, and recurring transactions. Your account and settings are kept.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              className="shrink-0 flex items-center gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset data
            </Button>
          </div>

          {/* Delete account */}
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

      {/* Reset financial data confirmation dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={(open) => {
        if (!resetting) {
          setResetDialogOpen(open)
          if (!open) { setResetConfirmText(""); setResetError(null) }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <RotateCcw className="h-5 w-5" />
              Reset all financial data
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all your transactions, budgets, goals, savings accounts, recurring transactions, and AI insights. Your account, profile, and subscription are not affected. <strong>This cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-xs text-muted-foreground">
              Type your email <span className="font-mono font-semibold text-foreground">{user.email}</span> to confirm.
            </p>
            <Input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder={user.email ?? ""}
              disabled={resetting}
              className="font-mono"
              autoComplete="off"
            />
            {resetError && <p className="text-sm text-destructive">{resetError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setResetDialogOpen(false); setResetConfirmText(""); setResetError(null) }}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetFinancialData}
              disabled={resetConfirmText.trim() !== user.email || resetting}
            >
              {resetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting…</> : "Reset all data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Setup Wizard */}
      <OnboardingDialog
        open={setupWizardOpen}
        onClose={() => setSetupWizardOpen(false)}
        onComplete={async (data) => {
          if (!user) return
          await completeOnboarding(user.uid, data)
          await refreshCurrency()
          setSetupWizardOpen(false)
          toast.success("Settings updated successfully.")
        }}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!deleting) {
          setDeleteDialogOpen(open)
          if (!open) { setConfirmText(""); setDeleteError(null) }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t("deleteAccountConfirmTitle")}
            </DialogTitle>
            <DialogDescription>{t("deleteAccountConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t("deleteAccountConfirmPlaceholder")}
              disabled={deleting}
              className="font-mono"
            />
            {deleteError && <p className="text-sm text-destructive mt-2">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteDialogOpen(false); setConfirmText(""); setDeleteError(null) }}
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
