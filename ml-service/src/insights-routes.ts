/**
 * Insights Routes
 *
 * Express router for AI-powered financial insight endpoints.
 * Mounted at /api/insights in api-server.ts.
 *
 * POST /api/insights/digest — generate monthly narrative digest
 * POST /api/insights/chat  — chat with AI grounded in financial context
 */

import { Router, Request, Response } from "express";
import { generateDigest, generateChatResponse, type ChatMessage } from "./gemini-handler";
import { checkSubscriptionTier, checkAndIncrementInsightsQuota } from "./firestore-quota";

const router = Router();

// A client can't be trusted to bound the history it sends; without a cap a
// single request could stuff hundreds of messages into the Gemini prompt and
// burn through the daily token quota.
const MAX_HISTORY_MESSAGES = 10;

function isConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Minimal shape check so malformed payloads get a 400 instead of a 500 from a
// TypeError deep inside the prompt builder.
function isValidContext(context: unknown): boolean {
  if (!context || typeof context !== "object") return false;
  const c = context as Record<string, unknown>;
  return (
    Array.isArray(c.topSpendingCategories) &&
    typeof c.currentMonth === "object" && c.currentMonth !== null &&
    typeof c.previousMonth === "object" && c.previousMonth !== null &&
    (c.unusualSpending === undefined || Array.isArray(c.unusualSpending))
  );
}

// ── POST /api/insights/digest ──────────────────────────────────────────────

router.post("/digest", async (req: Request, res: Response) => {
  if (!isConfigured()) {
    res.status(503).json({
      success: false,
      error: "AI not configured",
      message: "Add GEMINI_API_KEY to environment variables to enable AI insights.",
    });
    return;
  }

  const tier = await checkSubscriptionTier(req.uid!);
  if (tier === "free") {
    res.status(403).json({
      success: false,
      error: "SubscriptionRequired",
      message: "AI Monthly Summary requires a Pro or Business subscription.",
    });
    return;
  }

  const { context } = req.body;
  if (!isValidContext(context)) {
    res.status(400).json({ success: false, error: "Missing or invalid context" });
    return;
  }

  // Per-user daily cap (I9-5) — after body validation so a 400 doesn't burn a slot.
  const quota = await checkAndIncrementInsightsQuota(req.uid!, tier);
  if (!quota.allowed) {
    res.status(429).json({
      success: false,
      error: "RateLimited",
      message: `Daily AI insight limit reached (${quota.limit}/day). Try again tomorrow.`,
    });
    return;
  }

  try {
    const digest = await generateDigest(context);
    res.json({ success: true, digest });
  } catch (err: any) {
    console.error("[insights/digest] Error:", err.message);
    res.status(500).json({
      success: false,
      error: "Digest generation failed",
      message: err.message,
    });
  }
});

// ── POST /api/insights/chat ────────────────────────────────────────────────

router.post("/chat", async (req: Request, res: Response) => {
  if (!isConfigured()) {
    res.status(503).json({
      success: false,
      error: "AI not configured",
      message: "Add GEMINI_API_KEY to environment variables to enable AI insights.",
    });
    return;
  }

  const tier = await checkSubscriptionTier(req.uid!);
  if (tier === "free") {
    res.status(403).json({
      success: false,
      error: "SubscriptionRequired",
      message: "AI Budget Coach requires a Pro or Business subscription.",
    });
    return;
  }

  const { message, context, history } = req.body;
  if (!message || typeof message !== "string" || !isValidContext(context)) {
    res.status(400).json({ success: false, error: "Missing message or context" });
    return;
  }

  const boundedHistory = (Array.isArray(history) ? history : [])
    .filter((m): m is ChatMessage =>
      !!m && typeof m === "object" &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
    )
    .slice(-MAX_HISTORY_MESSAGES);

  // Per-user daily cap (I9-5) — after body validation so a 400 doesn't burn a slot.
  const quota = await checkAndIncrementInsightsQuota(req.uid!, tier);
  if (!quota.allowed) {
    res.status(429).json({
      success: false,
      error: "RateLimited",
      message: `Daily AI insight limit reached (${quota.limit}/day). Try again tomorrow.`,
    });
    return;
  }

  try {
    const response = await generateChatResponse(
      message,
      context,
      boundedHistory
    );
    res.json({ success: true, response });
  } catch (err: any) {
    console.error("[insights/chat] Error:", err.message);
    res.status(500).json({
      success: false,
      error: "Chat generation failed",
      message: err.message,
    });
  }
});

export default router;
