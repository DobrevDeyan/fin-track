import type { Metadata, Viewport } from "next"
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
import { SentryProvider } from "@/components/SentryProvider"
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

export const metadata: Metadata = {
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
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-96x96.png?v=3.0", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192x192.png?v=3.0", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png?v=3.0", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png?v=3.0", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/favicon.ico",
  },
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
    <html lang={defaultLocale} suppressHydrationWarning>
      <head>
        {/* Resource hints for Firebase - improve connection speed */}
        <link rel="preconnect" href="https://fin-track-adc2c.firebaseapp.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://apis.google.com" />
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Apple Touch Icon - iOS Safari */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=3.0" />
        {/* SVG favicon for modern browsers */}
        <link rel="icon" type="image/svg+xml" href="/icons/favicon.svg" />
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
            <CurrencyProvider>
              <LanguageProvider initialLocale={defaultLocale}>
                {children}
                <RegisterSW />
                <InstallPrompt />
                <SentryProvider />
                <Toaster richColors position="top-right" />
              </LanguageProvider>
            </CurrencyProvider>
          </AuthProvider>
          </ThemeContextProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


