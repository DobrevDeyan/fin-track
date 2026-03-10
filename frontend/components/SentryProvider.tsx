"use client"

/**
 * SentryProvider
 *
 * Client component whose sole purpose is to import lib/sentry.ts early in
 * the module graph so Sentry is initialized before any user code runs.
 * Renders nothing — include once in the root layout.
 */
import "@/lib/sentry"

export function SentryProvider() {
  return null
}
