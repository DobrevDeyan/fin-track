export const locales = ["en", "bg"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

export const localeNames: Record<Locale, string> = {
  en: "EN",
  bg: "BG",
}
