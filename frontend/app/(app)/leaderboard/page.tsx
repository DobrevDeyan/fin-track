"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getLeaderboardStats, getMyLeaderboardProfile, setLeaderboardOptIn } from "@/lib/firestore-leaderboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Trophy, Users, TrendingUp, ShieldCheck, Lock, CheckCircle2, Circle, RefreshCw } from "lucide-react"
import { doc, onSnapshot } from "firebase/firestore"
import { db, functions } from "@/lib/firebase"
import { httpsCallable } from "firebase/functions"
import type { LeaderboardStats, LeaderboardProfile, HealthTier } from "@/lib/firestore-types"
import dynamic from "next/dynamic"
import { Skeleton as ChartSkeleton2 } from "@/components/ui/skeleton"

const DistributionChart = dynamic(() => import("@/components/leaderboard/DistributionChart"), {
  loading: () => <ChartSkeleton2 className="h-40 w-full rounded-xl" />,
  ssr: false,
})

const TIER_COLORS: Record<HealthTier, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  "needs-work": "bg-orange-100 text-orange-700 border-orange-200",
  good: "bg-blue-100 text-blue-700 border-blue-200",
  excellent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  outstanding: "bg-purple-100 text-purple-700 border-purple-200",
}

const TIER_LABEL: Record<HealthTier, string> = {
  critical: "Critical",
  "needs-work": "Needs Work",
  good: "Good",
  excellent: "Excellent",
  outstanding: "Outstanding",
}

function TierBadge({ tier }: { tier: HealthTier }) {
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", TIER_COLORS[tier])}>
      {TIER_LABEL[tier]}
    </span>
  )
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-2xl bg-muted/50 border border-border/40">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function ScoreRing({ score, tier }: { score: number; tier: HealthTier }) {
  const ringColors: Record<HealthTier, string> = {
    critical: "#ef4444",
    "needs-work": "#f97316",
    good: "#3b82f6",
    excellent: "#10b981",
    outstanding: "#8b5cf6",
  }
  const r = 40
  const circumference = 2 * Math.PI * r
  const fill = (score / 100) * circumference
  const color = ringColors[tier]

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/40" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circumference}`}
        />
      </svg>
      <span className="absolute text-xl font-bold text-foreground">{score}</span>
    </div>
  )
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [profile, setProfile] = useState<LeaderboardProfile | null>(null)
  const [optedIn, setOptedIn] = useState<boolean>(false)
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
      const fresh = await getLeaderboardStats()
      setStats(fresh)
      if (user) {
        const p = await getMyLeaderboardProfile(user.uid)
        setProfile(p)
      }
    } catch { /* rate limited or network error — ignore */ } finally {
      setRefreshing(false)
    }
  }

  // Load leaderboard stats — wait for auth to fully resolve first
  useEffect(() => {
    if (authLoading || !user) return
    getLeaderboardStats()
      .then((s) => {
        setStats(s)
        // Auto-bootstrap if no stats exist yet
        if (!s) runAggregation()
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

  // Real-time listener on user doc for opt-in preference
  useEffect(() => {
    if (authLoading || !user) return
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => { setOptedIn(snap.data()?.leaderboardOptIn === true) },
      () => { /* suppress transient permission errors */ }
    )
    return unsub
  }, [user, authLoading])

  useEffect(() => {
    if (authLoading || !user || !optedIn) { setProfile(null); return }
    getMyLeaderboardProfile(user.uid)
      .then(setProfile)
      .catch(() => {})
  }, [user, authLoading, optedIn])

  const handleToggleOptIn = async () => {
    if (!user || toggling) return
    setToggling(true)
    try {
      await setLeaderboardOptIn(user.uid, !optedIn)
    } finally {
      setToggling(false)
    }
  }

  // Compute personal percentile
  const myPercentile = profile && stats
    ? Math.round(100 - (
        ([...stats.topScores].filter((s) => s.score > profile.score).length / stats.totalParticipants) * 100
      ))
    : null

  if (authLoading || !user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-amber-100 text-amber-600 shrink-0">
          <Trophy className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground leading-tight">Community Stats</h1>
          <p className="text-xs text-muted-foreground">Anonymous financial health scores across all members</p>
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

      {/* Platform summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Members" value={stats.totalParticipants} sub="opted-in participants" icon={Users} />
          <StatCard label="Median Score" value={stats.medianScore} sub={`avg ${stats.meanScore}`} icon={TrendingUp} />
          {profile ? (
            <StatCard label="Your Score" value={profile.score} sub={TIER_LABEL[profile.tier]} icon={ShieldCheck} />
          ) : (
            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-muted/30 border border-dashed border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Lock className="h-3.5 w-3.5" />
                Your Score
              </div>
              <p className="text-sm text-muted-foreground mt-1">Opt in below to see your rank</p>
            </div>
          )}
          {profile && stats.totalParticipants > 0 ? (
            <StatCard
              label="Your Percentile"
              value={`Top ${myPercentile}%`}
              sub={`${profile.anonymousHandle}`}
              icon={Trophy}
            />
          ) : (
            <div className="flex flex-col gap-1 p-4 rounded-2xl bg-muted/30 border border-dashed border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Trophy className="h-3.5 w-3.5" />
                Percentile
              </div>
              <p className="text-sm text-muted-foreground mt-1">—</p>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center py-10">
            No community data yet. Check back after the 2nd of the month.
          </CardContent>
        </Card>
      )}

      {/* Personal position card */}
      {profile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Your Position</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-5">
            <ScoreRing score={profile.score} tier={profile.tier} />
            <div className="flex flex-col gap-1.5">
              <TierBadge tier={profile.tier} />
              <p className="text-sm text-muted-foreground font-mono">{profile.anonymousHandle}</p>
              {stats && (
                <p className="text-xs text-muted-foreground">
                  Top {myPercentile}% of {stats.totalParticipants} participants
                </p>
              )}
              <p className="text-xs text-muted-foreground">{profile.monthsOfData} months of data</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score distribution */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Score Distribution</CardTitle>
            <CardDescription className="text-xs">How members are distributed across health tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionChart distribution={stats.tierDistribution} total={stats.totalParticipants} myTier={profile?.tier} />
          </CardContent>
        </Card>
      )}

      {/* Top 10 */}
      {stats && stats.totalParticipants >= 20 && stats.topScores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top 10
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {stats.topScores.map((entry, i) => {
                const isMe = profile?.anonymousHandle === entry.anonymousHandle
                return (
                  <div key={i} className={cn("flex items-center gap-3 px-4 py-2.5", isMe && "bg-primary/5")}>
                    <span className="w-6 text-xs font-bold text-muted-foreground text-right shrink-0">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <span className={cn("flex-1 text-sm font-mono", isMe && "font-semibold text-primary")}>
                      {entry.anonymousHandle}
                      {isMe && <span className="ml-1.5 text-xs text-primary/70">(you)</span>}
                    </span>
                    <span className="text-sm font-bold tabular-nums">{entry.score}</span>
                    <TierBadge tier={entry.tier} />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opt-in / privacy card */}
      <Card className={cn("border", optedIn ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10" : "border-border")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Privacy &amp; Participation
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Your <strong>real name, email, income amounts</strong>, and spending details are <strong>never shared</strong>.
            Only an anonymised score and a random handle (e.g. <span className="font-mono">#04821</span>) are included.
            You can opt out at any time and your data is deleted immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={optedIn ? "outline" : "default"}
            size="sm"
            onClick={handleToggleOptIn}
            disabled={toggling}
            className={cn("gap-2", optedIn && "border-emerald-300 text-emerald-700 hover:bg-emerald-50")}
          >
            {optedIn ? (
              <><CheckCircle2 className="h-4 w-4" /> Opted in — click to opt out</>
            ) : (
              <><Circle className="h-4 w-4" /> Include my score in community stats</>
            )}
          </Button>
          {optedIn && (
            <p className="text-xs text-muted-foreground mt-2">
              Your score will appear in the next daily aggregation (runs at 03:00 UTC).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
