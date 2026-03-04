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

const router = Router();

function isConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
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

  const { context } = req.body;
  if (!context) {
    res.status(400).json({ success: false, error: "Missing context" });
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

  const { message, context, history } = req.body;
  if (!message || !context) {
    res.status(400).json({ success: false, error: "Missing message or context" });
    return;
  }

  try {
    const response = await generateChatResponse(
      message,
      context,
      (history ?? []) as ChatMessage[]
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
