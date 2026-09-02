/**
 * Query Keys
 *
 * Central registry of TanStack Query cache keys. Keys are hierarchical, so
 * invalidating a parent invalidates everything under it:
 *
 *   entryKeys.all              -> ["entries"]                 invalidates both lists below
 *   entryKeys.list(uid)        -> ["entries","list",uid]      paginated dashboard table
 *   entryKeys.history(uid)     -> ["entries","history",uid]   full history, filter/search only
 *
 * Defining them here (rather than as string literals at each call site) is what
 * makes invalidation safe: a typo'd key silently never invalidates anything.
 */

export const entryKeys = {
  all: ["entries"] as const,
  lists: () => [...entryKeys.all, "list"] as const,
  list: (userId: string | undefined) => [...entryKeys.lists(), userId] as const,
  histories: () => [...entryKeys.all, "history"] as const,
  history: (userId: string | undefined) => [...entryKeys.histories(), userId] as const,
} as const
