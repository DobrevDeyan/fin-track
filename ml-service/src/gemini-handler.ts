/**
 * Gemini Handler
 *
 * Integrates Google Gemini 1.5 Flash (free tier) for AI-powered
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

// ── Types ──────────────────────────────────────────────────────────────────

interface SpendingContext {
  month: string;
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

  const prompt = `Here is the financial data for ${context.month}:

Current month: Income ${context.currentMonth.totalIncome}, Expenses ${context.currentMonth.totalExpenses}, Savings rate ${context.currentMonth.savingsRate}
Previous month: Income ${context.previousMonth.totalIncome}, Expenses ${context.previousMonth.totalExpenses}, Savings rate ${context.previousMonth.savingsRate}

Top spending categories: ${context.topSpendingCategories.map(c => `${c.name} (${c.percentOfTotal}% of spend)`).join(", ")}

Budget status: ${context.budgetSummary}

Goals: ${typeof context.goalsSummary === "string" ? context.goalsSummary : context.goalsSummary.map(g => `${g.name}: ${g.progress}`).join(", ")}

${context.unusualSpending.length > 0
    ? `Unusual spending this month: ${context.unusualSpending.map(u => `${u.category} is ${u.changePercent} above average`).join("; ")}`
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

  const contextSummary = `User's financial context (${context.month}):
Income: ${context.currentMonth.totalIncome}, Expenses: ${context.currentMonth.totalExpenses}, Savings rate: ${context.currentMonth.savingsRate}
Top categories: ${context.topSpendingCategories.map(c => `${c.name}: ${c.amount}`).join(", ")}
Budgets: ${context.budgetSummary}
Goals: ${typeof context.goalsSummary === "string" ? context.goalsSummary : context.goalsSummary.map(g => `${g.name} ${g.progress}`).join(", ")}`;

  // Build conversation history
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
    // Previous chat history
    ...history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.content }],
    })),
    // Current user message
    {
      role: "user" as const,
      parts: [{ text: userMessage }],
    },
  ];

  const result = await model.generateContent({
    systemInstruction: CHAT_SYSTEM_PROMPT,
    contents,
  });

  return result.response.text().trim();
}
