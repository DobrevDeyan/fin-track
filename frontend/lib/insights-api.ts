/**
 * Insights API
 *
 * Client-side helpers for calling the ML service's AI insight endpoints.
 * Mirrors the pattern of receipt-scanner-api.ts.
 */

import type { SpendingContext } from "./insights-engine"

const ML_SERVICE_URL =
  process.env.NEXT_PUBLIC_ML_SERVICE_URL || "http://localhost:8000"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface DigestResponse {
  success: boolean
  digest?: string
}

interface ChatResponse {
  success: boolean
  response?: string
}

/**
 * Request an AI-generated monthly financial digest.
 * Returns null if the service is unavailable or not configured.
 */
export async function fetchAIDigest(
  context: SpendingContext
): Promise<string | null> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/api/insights/digest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context }),
    })

    if (res.status === 503) return null // AI not configured
    if (!res.ok) return null

    const data = await res.json() as DigestResponse
    return data.success && typeof data.digest === "string" ? data.digest : null
  } catch {
    return null
  }
}

/**
 * Send a chat message and receive an AI response grounded in the user's data.
 * Returns null if the service is unavailable or not configured.
 */
export async function fetchAIChatResponse(
  message: string,
  context: SpendingContext,
  history: ChatMessage[]
): Promise<string | null> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/api/insights/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context, history }),
    })

    if (res.status === 503) return null
    if (!res.ok) return null

    const data = await res.json() as ChatResponse
    return data.success && typeof data.response === "string" ? data.response : null
  } catch {
    return null
  }
}
