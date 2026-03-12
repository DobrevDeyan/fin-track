"use client"

import { Lock } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface UpgradePromptProps {
  feature: string
  description: string
  requiredTier?: "pro" | "business"
  /** "card" replaces the entire content area; "overlay" floats over it */
  mode?: "card" | "overlay"
  className?: string
}

export function UpgradePrompt({
  feature,
  description,
  requiredTier = "pro",
  mode = "card",
  className,
}: UpgradePromptProps) {
  const router = useRouter()

  const tierLabel = requiredTier === "business" ? "Business" : "Pro"

  const content = (
    <div className="flex flex-col items-center justify-center gap-3 text-center p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm font-medium">{feature}</p>
          <Badge variant="secondary" className="text-xs text-primary">
            {tierLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground max-w-[220px]">{description}</p>
      </div>
      <Button
        size="sm"
        onClick={() => router.push("/?landing#pricing")}
        className="mt-1"
      >
        Upgrade to {tierLabel}
      </Button>
    </div>
  )

  if (mode === "overlay") {
    return (
      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm bg-background/80",
          className
        )}
      >
        {content}
      </div>
    )
  }

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  )
}
