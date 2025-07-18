import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import './streaming.css'

import { ErrorBoundary } from '@/components/error-boundary'
import Container from '@/app/container'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'VibeX | An open-source OpenAI Codex clone',
  description: 'Codex UI is a modern, open-source, and fully customizable UI for OpenAI Codex.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Global error handler for unhandled promise rejections
              window.addEventListener('unhandledrejection', function(event) {
                if (event.reason && event.reason.message) {
                  const message = event.reason.message;
                  if (message.includes('ReadableStream') ||
                      message.includes('cancel') ||
                      message.includes('locked stream') ||
                      message.includes('WebSocket') ||
                      message.includes('Authentication failed')) {
                    console.warn('Unhandled stream/connection error prevented:', message);
                    event.preventDefault();
                    return;
                  }
                }
                // Log other unhandled rejections for debugging
                console.warn('Unhandled promise rejection:', event.reason);
              });

              // Global error handler for general errors
              window.addEventListener('error', function(event) {
                if (event.error && event.error.message) {
                  const message = event.error.message;
                  if (message.includes('ReadableStream') ||
                      message.includes('cancel') ||
                      message.includes('locked stream')) {
                    console.warn('Stream error handled:', message);
                    event.preventDefault();
                    return;
                  }
                }
              });
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <ErrorBoundary>
            <Container>{children}</Container>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}
