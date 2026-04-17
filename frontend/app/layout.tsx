import type { Metadata, Viewport } from "next"
import * as Sentry from "@sentry/nextjs"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"
import Script from "next/script"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeContextProvider } from "@/contexts/ThemeContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { CurrencyProvider } from "@/contexts/CurrencyContext"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { RegisterSW } from "./register-sw"
import { InstallPrompt } from "@/components/InstallPrompt"
import { HouseholdProvider } from "@/contexts/HouseholdContext"
import { defaultLocale } from "@/i18n/config"
import { Toaster } from "sonner"

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
})

const poppins = Poppins({ 
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
})

export function generateMetadata(): Metadata {
  return {
    title: "Pocket - Smart Financial Management",
    description: "Track your expenses, manage your budget, and gain insights into your spending with manual entry tracking.",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Pocket",
    },
    icons: {
      icon: [
        { url: "/icons/favicon_dark/favicon.ico", sizes: "any" },
        { url: "/icons/favicon_dark/favicon.svg", type: "image/svg+xml" },
        { url: "/icons/favicon_dark/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/icons/favicon_dark/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/favicon_dark/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/icons/favicon_dark/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      shortcut: "/icons/favicon_dark/favicon.ico",
    },
    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export const viewport: Viewport = {
  themeColor: "#34DB96",
  maximumScale: 1.0,
  userScalable: false,
  width: "device-width",
  initialScale: 1.0,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang={defaultLocale} suppressHydrationWarning translate="no">
      <head>
        {/* Resource hints for Firebase - improve connection speed */}
        <link rel="preconnect" href="https://fin-track-adc2c.firebaseapp.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://apis.google.com" />
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Apple Touch Icon - iOS Safari */}
        <link rel="apple-touch-icon" href="/icons/favicon_dark/apple-touch-icon.png" />
        {/* Theme-aware SVG favicon for modern browsers */}
        <link rel="icon" type="image/svg+xml" href="/icons/favicon_dark/favicon.svg" media="(prefers-color-scheme: dark)" />
        <link rel="icon" type="image/svg+xml" href="/icons/favicon_light/favicon.svg" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/icons/favicon_dark/favicon.ico" sizes="any" />
      </head>
      {plausibleDomain && (
        <Script
          defer
          data-domain={plausibleDomain}
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      )}
      <body className={`${inter.variable} ${poppins.variable} ${inter.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ThemeContextProvider>
          <AuthProvider>
            <HouseholdProvider>
            <CurrencyProvider>
              <LanguageProvider initialLocale={defaultLocale}>
                {children}
                <RegisterSW />
                <InstallPrompt />
<Toaster richColors position="top-right" />
              </LanguageProvider>
            </CurrencyProvider>
            </HouseholdProvider>
          </AuthProvider>
          </ThemeContextProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


