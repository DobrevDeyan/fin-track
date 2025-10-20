import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinTrack - Personal Finance Management',
  description: 'Take control of your finances with FinTrack. Track expenses, set budgets, and achieve your financial goals.',
  keywords: ['finance', 'budget', 'expense tracking', 'personal finance', 'money management'],
  authors: [{ name: 'FinTrack Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
