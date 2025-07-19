'use client'

import { ThemeProvider } from 'next-themes'
import { ErrorBoundary } from '@/components/error-boundary'
import { ElectricProvider } from '@/components/providers/electric-provider'
import { QueryProvider } from '@/components/providers/query-provider'

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <QueryProvider>
        <ElectricProvider
          fallback={
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-blue-600 border-b-2" />
                <p className="text-gray-600">Initializing real-time sync...</p>
              </div>
            </div>
          }
          onError={(error) => {
            console.error('ElectricSQL error:', error)
          }}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ElectricProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}