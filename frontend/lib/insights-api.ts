/**
 * Insights API
 *
 * Client-side helpers for calling the ML service's AI insight endpoints.
 * Mirrors the pattern of receipt-scanner-api.ts.
 */

import type { SpendingContext } from "./insights-engine"
import { logger } from "./utils/logger"

const ML_SERVICE_URL =
  process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:8000"

// Surface a misconfigured deploy loudly instead of silently calling localhost (which
// just looks like "AI not configured" to the user). (I9-13)
if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_ML_SERVICE_URL
) {
  logger.warn(
    "[insights-api] NEXT_PUBLIC_ML_SERVICE_URL is not set — AI insights will call localhost:8000 and fail."
  )
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

/**
 * Result of an AI call. `not_configured` means the service has no Gemini key (HTTP
 * 503) — a permanent state to message the user about. `error` means a transient
 * failure (network, 5xx, malformed body) the user can retry. Collapsing the two to
 * `null` (the old behaviour) made transient failures look like misconfiguration and
 * vice versa. (I9-8 / I9-10)
 */
export type AIResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_configured" | "error" }

interface DigestResponse {
  success: boolean
  digest?: string
}

interface ChatResponse {
  success: boolean
  response?: string
}

/** Request an AI-generated monthly financial digest. */
export async function fetchAIDigest(
  context: SpendingContext,
  token: string
): Promise<AIResult<string>> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/api/insights/digest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ context }),
    })

    if (res.status === 503) return { ok: false, reason: "not_configured" }
    if (!res.ok) return { ok: false, reason: "error" }

    const data = await res.json() as DigestResponse
    if (data.success && typeof data.digest === "string") {
      return { ok: true, data: data.digest }
    }
    return { ok: false, reason: "error" }
  } catch (err) {
    logger.error("[insights-api] fetchAIDigest error", err)
    return { ok: false, reason: "error" }
  }
}

/** Send a chat message and receive an AI response grounded in the user's data. */
export async function fetchAIChatResponse(
  message: string,
  context: SpendingContext,
  history: ChatMessage[],
  token: string
): Promise<AIResult<string>> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/api/insights/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ message, context, history }),
    })

    if (res.status === 503) return { ok: false, reason: "not_configured" }
    if (!res.ok) return { ok: false, reason: "error" }

    const data = await res.json() as ChatResponse
    if (data.success && typeof data.response === "string") {
      return { ok: true, data: data.response }
    }
    return { ok: false, reason: "error" }
  } catch (err) {
    logger.error("[insights-api] fetchAIChatResponse error", err)
    return { ok: false, reason: "error" }
  }
}
