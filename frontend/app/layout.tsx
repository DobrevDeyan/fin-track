import type { Metadata, Viewport } from "next"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { CurrencyProvider } from "@/contexts/CurrencyContext"
import { LanguageProvider } from "@/contexts/LanguageContext"
import { RegisterSW } from "./register-sw"
import { InstallPrompt } from "@/components/InstallPrompt"
import { getLocale } from "next-intl/server"

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
      { url: "/icons/icon-32x32.png?v=2.5", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-96x96.png?v=2.5", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192x192.png?v=2.5", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png?v=2.5", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png?v=2.5", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/icon-32x32.png?v=2.5",
  },
}

export const viewport: Viewport = {
  themeColor: "#34DB96",
  maximumScale: 1.0,
  userScalable: false,
  width: "device-width",
  initialScale: 1.0,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className="light" suppressHydrationWarning>
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
        {/* Apple Touch Icons - iOS Safari uses these specifically */}
        {/* Version query param forces cache refresh - synced via npm run sync-version */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png?v=2.5" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png?v=2.5" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png?v=2.5" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-128x128.png?v=2.5" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icons/icon-128x128.png?v=2.5" />
        <link rel="apple-touch-icon" sizes="76x76" href="/icons/icon-96x96.png?v=2.5" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/icon-72x72.png?v=2.5" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png?v=2.5" />
      </head>
      <body className={`${inter.variable} ${poppins.variable} ${inter.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <CurrencyProvider>
              <LanguageProvider initialLocale={locale}>
                {children}
                <RegisterSW />
                <InstallPrompt />
              </LanguageProvider>
            </CurrencyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


