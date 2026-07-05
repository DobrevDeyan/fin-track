"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getMyLeaderboardProfile, setLeaderboardOptIn } from "@/lib/firestore-leaderboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { Trophy, Users, TrendingUp, ShieldCheck, CheckCircle2, Circle, RefreshCw } from "lucide-react"
import { doc, onSnapshot } from "firebase/firestore"
import { db, functions } from "@/lib/firebase"
import { httpsCallable } from "firebase/functions"
import type { LeaderboardStats, LeaderboardProfile, HealthTier } from "@/lib/firestore-types"

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_BAR_COLOR: Record<HealthTier, string> = {
  critical:    "bg-red-500",
  "needs-work":"bg-orange-500",
  good:        "bg-blue-500",
  excellent:   "bg-emerald-500",
  outstanding: "bg-purple-500",
}

const TIER_LABEL: Record<HealthTier, string> = {
  critical: "Critical",
  "needs-work": "Needs Work",
  good: "Good",
  excellent: "Excellent",
  outstanding: "Outstanding",
}

const TIER_TEXT: Record<HealthTier, string> = {
  critical:    "text-red-500",
  "needs-work":"text-orange-500",
  good:        "text-blue-500",
  excellent:   "text-emerald-500",
  outstanding: "text-purple-500",
}

const RANK_MEDAL = ["🥇", "🥈", "🥉"]

// ─── Score row ────────────────────────────────────────────────────────────────

function ScoreRow({
  rank,
  handle,
  score,
  tier,
  isMe,
}: {
  rank: number
  handle: string
  score: number
  tier: HealthTier
  isMe: boolean
}) {
  const pct = Math.round((score / 100) * 100) // score IS already 0-100

  return (
    <div className={cn(
      "flex flex-col gap-1.5 px-4 py-3 transition-colors",
      isMe
        ? "bg-primary/8 border-l-2 border-primary"
        : "hover:bg-muted/40",
    )}>
      {/* Top row: rank + handle + score */}
      <div className="flex items-center gap-3">
        <span className="w-7 text-sm font-bold text-muted-foreground text-center shrink-0 tabular-nums">
          {rank <= 3 ? RANK_MEDAL[rank - 1] : `${rank}`}
        </span>
        <span className={cn(
          "flex-1 text-sm font-mono truncate",
          isMe ? "font-bold text-primary" : "text-foreground/80"
        )}>
          {handle}
          {isMe && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-primary/60 bg-primary/10 px-1.5 py-0.5 rounded-full">you</span>}
        </span>
        <span className={cn("text-sm font-bold tabular-nums shrink-0", isMe ? "text-primary" : TIER_TEXT[tier])}>
          {score}<span className="text-xs font-normal text-muted-foreground">/100</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="w-7 shrink-0" /> {/* spacer aligns with rank column */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", isMe ? "bg-primary" : TIER_BAR_COLOR[tier])}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0 tabular-nums">
            {pct}%
          </span>
        </div>
        <span className={cn("text-[10px] font-semibold shrink-0", TIER_TEXT[tier])}>
          {TIER_LABEL[tier]}
        </span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [profile, setProfile] = useState<LeaderboardProfile | null>(null)
  const [optedIn, setOptedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth/login")
  }, [user, authLoading, router])

  const runAggregation = async () => {
    setRefreshing(true)
    try {
      await httpsCallable(functions, "triggerLeaderboardAggregation")()
      if (user) {
        const p = await getMyLeaderboardProfile(user.uid)
        setProfile(p)
      }
    } catch { /* rate limited or network error */ } finally {
      setRefreshing(false)
    }
  }

  // Live listener on leaderboardStats/current
  useEffect(() => {
    if (authLoading || !user) return
    const unsub = onSnapshot(
      doc(db, "leaderboardStats", "current"),
      (snap) => {
        const data = snap.exists() ? (snap.data() as LeaderboardStats) : null
        setStats(data)
        setLoading(false)
        if (!data) runAggregation()
      },
      () => setLoading(false)
    )
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  // Live listener on user doc for opt-in state
  useEffect(() => {
    if (authLoading || !user) return
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => setOptedIn(snap.data()?.leaderboardOptIn === true),
      () => {}
    )
    return unsub
  }, [user, authLoading])

  // Load personal profile when opted in
  useEffect(() => {
    if (authLoading || !user || !optedIn) { setProfile(null); return }
    getMyLeaderboardProfile(user.uid).then(setProfile).catch(() => {})
  }, [user, authLoading, optedIn])

  const handleToggleOptIn = async () => {
    if (!user || toggling) return
    setToggling(true)
    try { await setLeaderboardOptIn(user.uid, !optedIn) }
    finally { setToggling(false) }
  }

  if (authLoading || !user) return null

  // Build the display list — top scores + inject current user if not already in list
  const topScores = stats?.topScores ?? []
  const myHandle = profile?.anonymousHandle
  const meInTop = myHandle ? topScores.some((s) => s.anonymousHandle === myHandle) : false

  // Build ranked list: if user exists but isn't in top list, append them at the end
  const displayList = [
    ...topScores.map((s, i) => ({ ...s, rank: i + 1 })),
    ...(!meInTop && profile
      ? [{ anonymousHandle: profile.anonymousHandle, score: profile.score, tier: profile.tier, rank: "?" as const }]
      : []),
  ]

  // The stats snapshot can lag behind individual profiles (it's only rewritten on
  // aggregation). When we've injected the viewer's own profile that the snapshot
  // doesn't know about yet, the displayed list is larger than stats.totalParticipants
  // — reconcile so the "members" pill and the list header never contradict each other.
  const effectiveTotal = Math.max(stats?.totalParticipants ?? 0, displayList.length)

  // Percentile: how many in top list have a higher score
  const aboveMe = profile && stats
    ? topScores.filter((s) => s.score > profile.score).length
    : 0
  const myPercentile = profile && stats && stats.totalParticipants > 0
    ? Math.max(1, Math.round(100 - (aboveMe / stats.totalParticipants) * 100))
    : null

  return (
    <div className="container py-8 px-4 sm:px-6 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 shrink-0">
          <Trophy className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground leading-tight">Community Leaderboard</h1>
          <p className="text-xs text-muted-foreground">Anonymous financial health scores · 100 = optimal</p>
        </div>
        <button
          onClick={runAggregation}
          disabled={refreshing || loading}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40"
          title="Refresh scores"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Summary pills */}
      {stats && (
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 text-xs font-medium text-foreground">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {effectiveTotal} member{effectiveTotal !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 text-xs font-medium text-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            Median {stats.medianScore}/100
          </div>
          {myPercentile !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary">
              <Trophy className="h-3.5 w-3.5" />
              You · top {myPercentile}%
            </div>
          )}
        </div>
      )}

      {/* Your score hero — shown when opted in */}
      {profile && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              {/* Big score ring */}
              <div className="relative shrink-0">
                <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
                  <circle cx="36" cy="36" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                  <circle
                    cx="36" cy="36" r="28" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(profile.score / 100) * 2 * Math.PI * 28} ${2 * Math.PI * 28}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">{profile.score}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Your health score</p>
                {/* Full-width progress bar */}
                <div className="h-3 rounded-full bg-muted overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${profile.score}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-semibold", TIER_TEXT[profile.tier])}>{TIER_LABEL[profile.tier]}</span>
                  <span className="text-xs text-muted-foreground font-mono">{profile.anonymousHandle}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-primary">{profile.score}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                {myPercentile !== null && (
                  <p className="text-xs text-muted-foreground">top {myPercentile}%</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard list */}
      {loading ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </CardContent>
        </Card>
      ) : displayList.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader className="pb-0 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {stats && stats.totalParticipants > displayList.length
                ? `Top ${stats.topScores.length} of ${stats.totalParticipants}`
                : `${effectiveTotal} participant${effectiveTotal !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="divide-y divide-border/40">
              {displayList.map((entry) => (
                <ScoreRow
                  key={entry.anonymousHandle}
                  rank={typeof entry.rank === "number" ? entry.rank : displayList.length}
                  handle={entry.anonymousHandle}
                  score={entry.score}
                  tier={entry.tier}
                  isMe={entry.anonymousHandle === myHandle}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No scores yet — hit ↻ to generate the first leaderboard.
          </CardContent>
        </Card>
      )}

      {/* Opt-in card */}
      <Card className={cn("border", optedIn ? "border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10" : "")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Privacy &amp; Participation
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Your name, email, income and spending are <strong>never shared</strong>. Only an opaque score + random handle (e.g. <span className="font-mono">#04821</span>) are included. Opt out anytime to delete instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={optedIn ? "outline" : "default"}
            size="sm"
            onClick={handleToggleOptIn}
            disabled={toggling}
            className={cn("gap-2", optedIn && "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950")}
          >
            {optedIn
              ? <><CheckCircle2 className="h-4 w-4" /> Opted in — click to opt out</>
              : <><Circle className="h-4 w-4" /> Include my score</>}
          </Button>
          {optedIn && !profile && (
            <p className="text-xs text-muted-foreground mt-2">
              Hit ↻ to compute your score now, or wait for the daily run at 03:00 UTC.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
