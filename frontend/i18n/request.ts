import { getRequestConfig } from "next-intl/server"
import { defaultLocale } from "./config" // Ensure defaultLocale is imported

export default getRequestConfig(async ({ locale }) => {
  const currentLocale = locale ?? defaultLocale; // Use defaultLocale if locale is undefined

  return {
    locale: currentLocale as string,
    messages: (await import(`../messages/${currentLocale}.json`)).default,
  }
})
