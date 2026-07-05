import type { Metadata } from "next"
import { Footer } from "@/components/Footer"

export const metadata: Metadata = {
  title: "Privacy Policy — Pocket",
  description: "How Pocket collects, uses, and protects your data.",
}

const sections = [
  {
    title: "1. Who we are",
    body: [
      "Pocket is a personal finance tracking application. This policy explains what data we collect when you use Pocket, why we collect it, and the choices you have.",
    ],
  },
  {
    title: "2. Data we collect",
    body: [
      "Account data: your email address, display name, and profile photo if you sign in with Google.",
      "Financial data you enter: transactions, budgets, savings goals, savings accounts, recurring transactions, debts, and any notes or tags you attach to them.",
      "Receipts: images or PDFs you upload or photograph for receipt scanning.",
      "Usage and diagnostics: crash reports and error diagnostics collected through Sentry, and basic device information needed to run the app.",
    ],
  },
  {
    title: "3. How we use your data",
    body: [
      "To provide the core service: storing your entries, computing budgets, goals, and your financial health score.",
      "To power optional AI features: if you use the AI digest or AI budget coach, summarized spending data is sent to Google's Gemini API to generate a response. If you scan a receipt, the image is processed by Google Document AI to extract the merchant, amount, and date.",
      "To process payments: subscriptions are handled by Stripe. We never see or store your full card details.",
      "We do not sell your data or share it with third parties for advertising.",
    ],
  },
  {
    title: "4. Where your data lives",
    body: [
      "Your data is stored in Google Firebase (Firestore, Storage, and Authentication) and transmitted over HTTPS. Receipt scanning and AI features run on Google Cloud in the EU (europe-west1).",
    ],
  },
  {
    title: "5. Data retention and deletion",
    body: [
      "Your data is kept for as long as your account exists. You can delete your account at any time from Account Settings — this permanently deletes your transactions, budgets, goals, savings accounts, receipts, and your authentication account. This action cannot be undone.",
    ],
  },
  {
    title: "6. Your rights",
    body: [
      "Depending on where you live (including under the GDPR), you have the right to access, correct, export, or delete your personal data. You can export your transactions as CSV or PDF from the Reports page and delete your account from Settings. For anything else, contact us.",
    ],
  },
  {
    title: "7. Changes to this policy",
    body: [
      "If we make material changes to this policy, we will update the date below and, where appropriate, notify you in the app.",
    ],
  },
  {
    title: "8. Contact",
    body: [
      "Questions about this policy or your data? Email us at support@pocket-app.com.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <>
      <main className="container max-w-3xl py-24 sm:py-28">
        <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 5, 2026</p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-semibold">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-3 text-muted-foreground leading-relaxed">{p}</p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
