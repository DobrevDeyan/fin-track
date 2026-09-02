"use client"

/**
 * TanStack Query provider.
 *
 * The QueryClient is created inside useState so each browser session gets one
 * client that survives re-renders, and so it is never created at module scope
 * (which on the server would share one cache across every request).
 *
 * Defaults are tuned for Firestore, where every refetch is a billed read:
 * - staleTime 5m   : matches the lifetime the hand-rolled entry cache had
 * - refetchOnWindowFocus off : the old hooks never refetched on focus; turning
 *   it on would silently multiply reads for anyone alt-tabbing
 * - retry 1        : the old code deliberately did not retry in a loop
 */

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
