/**
 * Sentry error monitoring initialization.
 * Client-side only — runs in the browser.
 * Import this via SentryProvider to ensure early initialization.
 */
import * as Sentry from "@sentry/browser"

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend(event) {
      // Don't send events in development
      if (process.env.NODE_ENV === "development") return null
      return event
    },
  })
}

export { Sentry }

/**
 * USE FOR TESTING ONLY: Manually trigger an error to verify Sentry setup.
 * Note: This only works if NEXT_PUBLIC_SENTRY_DSN is set and NOT in development,
 * unless you temporarily comment out the beforeSend check above.
 */
export function testSentryError() {
  try {
    throw new Error("Sentry Setup Test: " + new Date().toISOString());
  } catch (err) {
    Sentry.captureException(err);
    console.log("Test error sent to Sentry. Check your dashboard.");
  }
}
