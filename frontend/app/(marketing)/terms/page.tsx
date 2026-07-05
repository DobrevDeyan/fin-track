import type { Metadata } from "next"
import { Footer } from "@/components/Footer"

export const metadata: Metadata = {
  title: "Terms of Service — Pocket",
  description: "The terms that govern your use of Pocket.",
}

const sections = [
  {
    title: "1. The service",
    body: [
      "Pocket is a personal finance tracking application. By creating an account or using Pocket, you agree to these terms.",
    ],
  },
  {
    title: "2. Your account",
    body: [
      "You are responsible for the accuracy of the data you enter and for keeping access to your account secure. You must be at least 16 years old to use Pocket.",
    ],
  },
  {
    title: "3. Plans, billing, and cancellation",
    body: [
      "Pocket offers a free plan and paid subscriptions (Pro and Business) billed through Stripe on a monthly or yearly basis. Plan limits — such as the number of transactions, budgets, goals, and receipt scans per month — are described on the pricing page and may evolve over time.",
      "You can cancel your subscription at any time from Account Settings; your paid features remain active until the end of the current billing period. Fees already paid are non-refundable except where required by law.",
    ],
  },
  {
    title: "4. Not financial advice",
    body: [
      "Pocket, including its AI-generated digests, forecasts, and coach responses, provides informational summaries of the data you enter. Nothing in the app is financial, investment, tax, or legal advice. AI-generated content can be inaccurate — verify anything important before acting on it.",
    ],
  },
  {
    title: "5. Acceptable use",
    body: [
      "Don't misuse the service: no attempts to break, overload, or reverse-engineer it, no uploading unlawful content, and no using the service to violate anyone else's rights.",
    ],
  },
  {
    title: "6. Availability and changes",
    body: [
      "We work to keep Pocket available and your data safe, but the service is provided \"as is\" without warranties of any kind. We may add, change, or remove features, and we may update these terms — material changes will be reflected by the date below.",
    ],
  },
  {
    title: "7. Liability",
    body: [
      "To the maximum extent permitted by law, our liability for any claim arising from your use of Pocket is limited to the amount you paid us in the twelve months before the claim.",
    ],
  },
  {
    title: "8. Termination",
    body: [
      "You can stop using Pocket and delete your account at any time from Account Settings. We may suspend or terminate accounts that violate these terms.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "Questions about these terms? Email us at support@pocket-app.com.",
    ],
  },
]

export default function TermsPage() {
  return (
    <>
      <main className="container max-w-3xl py-24 sm:py-28">
        <h1 className="text-3xl md:text-4xl font-bold">Terms of Service</h1>
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
