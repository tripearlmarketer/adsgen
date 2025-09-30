import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { QueryProvider } from '@/components/query-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DemandGen Pro - Google Ads Campaign Management',
  description: 'Professional Google Ads Demand Gen campaign management platform for Malaysia market',
  keywords: ['Google Ads', 'Demand Gen', 'Malaysia', 'Campaign Management', 'Digital Marketing'],
  authors: [{ name: 'DemandGen Pro Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'DemandGen Pro - Google Ads Campaign Management',
    description: 'Professional Google Ads Demand Gen campaign management platform for Malaysia market',
    type: 'website',
    locale: 'en_MY',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
