import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider'
import { AuthProvider } from '@/contexts/AuthContext'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Google Sans substitute (Premium Body Font)
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Outfit (Modern Minimal Heading Font)
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata = {
  title: {
    default: 'Quinite Vantage - AI Powered Call Automation Platform',
    template: '%s | Quinite Vantage'
  },
  description: 'Automate lead calling with AI agents. Qualify prospects intelligently and transfer interested leads to your team. TRAI compliant call automation for businesses in India.',
  keywords: [
    'AI call automation',
    'lead calling software',
    'automated calling India',
    'AI voice agent',
    'call center automation',
    'lead qualification',
    'Plivo integration',
    'OpenAI voice',
    'TRAI compliant calling',
    'business automation India'
  ],
  authors: [{ name: 'Quinite Vantage' }],
  creator: 'Quinite Vantage',
  publisher: 'Quinite Vantage',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),

  openGraph: {
    title: 'Quinite Vantage - AI-Powered Call Automation Platform',
    description: 'Automate lead calling with AI agents. Qualify prospects and transfer interested leads to your team.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    siteName: 'Quinite Vantage',
    locale: 'en_IN',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Quinite Vantage' }],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Quinite Vantage - AI-Powered Call Automation',
    description: 'Automate lead calling with AI agents. TRAI compliant for India.',
    images: ['/og-image.png'],
  },

  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Ensures app-like feel on mobile
}

export default async function RootLayout({ children }) {
  let initialUser = null
  let initialProfile = null

  try {
    // 1. Check for session in a server-side way
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      initialUser = user
      
      // 2. Proactively fetch profile with admin client to ensure it's available for hydration
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from('profiles')
        .select('*, organization:organizations(*)')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        initialProfile = profile
      }
    }
  } catch (error) {
    console.warn('[RootLayout] Server-side auth check skipped or failed:', error.message)
    // Fallback gracefully: the client-side AuthContext will try again if needed
  }

  return (
    <html lang="en">
      <body className={`${inter.variable} ${jakarta.variable} font-sans`}>
        <ReactQueryProvider>
          <AuthProvider 
            initialUser={initialUser} 
            initialProfile={initialProfile}
          >
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </ReactQueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
