/**
 * Gemini Handler
 *
 * Integrates Google Gemini 2.5 Flash (free tier) for AI-powered
 * financial insights. Uses the @google/generative-ai SDK with an
 * API key from Google AI Studio (aistudio.google.com).
 *
 * Free tier: 1,500 requests/day, 15 RPM — no credit card required.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazily initialised so missing key doesn't crash at startup
let genAI: GoogleGenerativeAI | null = null;

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

// ── Input Sanitisation ─────────────────────────────────────────────────────

/**
 * Sanitise a string before embedding it in a Gemini prompt.
 * Prevents prompt injection by truncating, stripping control characters,
 * and collapsing excessive whitespace.
 */
function sanitizeInput(input: string, maxLength = 500): string {
  return input
    .slice(0, maxLength)
    // Strip null bytes and non-printable ASCII control characters (except \t and \n)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Collapse 3+ consecutive newlines into two
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Sanitise a short label string (category name, goal name, etc.) */
function sanitizeLabel(input: unknown): string {
  if (typeof input !== "string") return "";
  return sanitizeInput(String(input), 100);
}

// ── Types ──────────────────────────────────────────────────────────────────

interface SpendingContext {
  month: string;
  /** Display currency code the amounts are expressed in (e.g. "EUR", "USD"). */
  currency?: string;
  currentMonth: { totalIncome: number; totalExpenses: number; savingsRate: string };
  previousMonth: { totalIncome: number; totalExpenses: number; savingsRate: string };
  topSpendingCategories: Array<{ name: string; amount: number; percentOfTotal: number }>;
  budgetSummary: string;
  goalsSummary: Array<{ name: string; progress: string }> | string;
  unusualSpending: Array<{ category: string; changePercent: string; current: number; average: number }>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Digest ─────────────────────────────────────────────────────────────────

const DIGEST_SYSTEM_PROMPT = `You are a friendly, concise personal finance advisor.
You have been given a user's aggregated financial summary for the current month (no personal details, just numbers).
Write a 3–5 sentence narrative in plain English that:
- Highlights the most notable positive or negative change vs. last month
- Calls out any unusual category spending (if present)
- Gives one actionable, specific recommendation
- Is encouraging and not judgmental
Do NOT list bullet points. Write flowing prose. Keep it under 120 words.`;

export async function generateDigest(context: SpendingContext): Promise<string> {
  const model = getModel();

  // Sanitise user-originated string fields before embedding in the prompt
  const sanitizedCategories = context.topSpendingCategories.map(c => ({
    name: sanitizeLabel(c.name),
    amount: c.amount,
    percentOfTotal: c.percentOfTotal,
  }));
  const sanitizedBudgetSummary = sanitizeInput(context.budgetSummary, 300);
  const sanitizedGoals = typeof context.goalsSummary === "string"
    ? sanitizeInput(context.goalsSummary, 300)
    : context.goalsSummary.map(g => ({ name: sanitizeLabel(g.name), progress: sanitizeLabel(g.progress) }));
  const sanitizedUnusual = context.unusualSpending.map(u => ({
    category: sanitizeLabel(u.category),
    changePercent: sanitizeLabel(u.changePercent),
    current: u.current,
    average: u.average,
  }));

  const currency = sanitizeLabel(context.currency || "EUR");

  const prompt = `Here is the financial data for ${sanitizeLabel(context.month)}. All monetary amounts are in ${currency} — use that currency in your response:

Current month: Income ${context.currentMonth.totalIncome}, Expenses ${context.currentMonth.totalExpenses}, Savings rate ${sanitizeLabel(context.currentMonth.savingsRate)}
Previous month: Income ${context.previousMonth.totalIncome}, Expenses ${context.previousMonth.totalExpenses}, Savings rate ${sanitizeLabel(context.previousMonth.savingsRate)}

Top spending categories: ${sanitizedCategories.map(c => `${c.name} (${c.percentOfTotal}% of spend)`).join(", ")}

Budget status: ${sanitizedBudgetSummary}

Goals: ${typeof sanitizedGoals === "string" ? sanitizedGoals : sanitizedGoals.map(g => `${g.name}: ${g.progress}`).join(", ")}

${sanitizedUnusual.length > 0
    ? `Unusual spending this month: ${sanitizedUnusual.map(u => `${u.category} is ${u.changePercent} above average`).join("; ")}`
    : "No unusual spending patterns detected."
  }

Write the financial summary now:`;

  const result = await model.generateContent({
    systemInstruction: DIGEST_SYSTEM_PROMPT,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.response.text().trim();
}

// ── Chat ───────────────────────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT = `You are a friendly personal finance coach embedded in a budgeting app.
You have access to the user's aggregated financial data (category totals, budget status, goal progress — no raw transaction descriptions).
Rules:
- Answer only questions related to the user's finances or general personal finance advice
- Keep answers to 2–4 sentences
- Be specific: reference the actual numbers from the context
- Be encouraging and actionable
- If asked something outside finance, politely redirect`;

export async function generateChatResponse(
  userMessage: string,
  context: SpendingContext,
  history: ChatMessage[]
): Promise<string> {
  const model = getModel();

  // Sanitise the user message to prevent prompt injection
  const safeMessage = sanitizeInput(userMessage, 500);

  // Sanitise context fields that originate from user data
  const sanitizedCategories = context.topSpendingCategories.map(c => ({
    name: sanitizeLabel(c.name),
    amount: c.amount,
  }));
  const sanitizedBudgetSummary = sanitizeInput(context.budgetSummary, 300);
  const sanitizedGoals = typeof context.goalsSummary === "string"
    ? sanitizeInput(context.goalsSummary, 300)
    : context.goalsSummary.map(g => ({ name: sanitizeLabel(g.name), progress: sanitizeLabel(g.progress) }));

  const currency = sanitizeLabel(context.currency || "EUR");

  const contextSummary = `User's financial context (${sanitizeLabel(context.month)}). All amounts are in ${currency} — use that currency in your answers:
Income: ${context.currentMonth.totalIncome}, Expenses: ${context.currentMonth.totalExpenses}, Savings rate: ${sanitizeLabel(context.currentMonth.savingsRate)}
Top categories: ${sanitizedCategories.map(c => `${c.name}: ${c.amount}`).join(", ")}
Budgets: ${sanitizedBudgetSummary}
Goals: ${typeof sanitizedGoals === "string" ? sanitizedGoals : sanitizedGoals.map(g => `${g.name} ${g.progress}`).join(", ")}`;

  // Build conversation history (sanitise previous messages too)
  const contents = [
    // Inject context as first user turn
    {
      role: "user" as const,
      parts: [{ text: contextSummary }],
    },
    {
      role: "model" as const,
      parts: [{ text: "Got it, I have your financial context. How can I help you?" }],
    },
    // Previous chat history — cap to the last 10 turns so the payload (and Gemini
    // cost/latency) can't grow unbounded over a long session. (I9-12)
    ...history.slice(-10).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: sanitizeInput(m.content, 500) }],
    })),
    // Current user message (already sanitised above)
    {
      role: "user" as const,
      parts: [{ text: safeMessage }],
    },
  ];

  const result = await model.generateContent({
    systemInstruction: CHAT_SYSTEM_PROMPT,
    contents,
  });

  return result.response.text().trim();
}
