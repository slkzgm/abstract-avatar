// path: src/app/layout.tsx
import type React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Portal Avatar - Mint and Manage your Abstract Portal Avatar',
    template: '%s | Portal Avatar',
  },
  description: 'Easily mint and manage your Portal Avatar.',
  keywords: ['NFT', 'Avatar', 'Portal', 'Abstract Foundation', 'Next.js', 'React', 'Viem'],
  openGraph: {
    title: 'Portal Avatar - Mint and Manage your Abstract Portal Avatar',
    description: 'Easily mint and manage your Portal Avatar.',
    url: 'https://avatar.abstools.xyz',
    siteName: 'Portal Avatar',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Portal Avatar',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portal Avatar - Mint and Manage your Abstract Portal Avatar',
    description: 'Easily mint and manage your Portal Avatar.',
    images: ['/og-image.png'],
    creator: '@slkzgm',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
