'use client'

import { Button } from '@/components/ui/button'
import { useAnthropicAuth } from '@/hooks/use-anthropic-auth'
import { LogIn } from 'lucide-react'
import { AuthCardBase } from './auth-card-base'

export function AnthropicAuthCard() {
  const { authenticated, loading, login, logout, expires, type, error } = useAnthropicAuth()

  const isExpiringSoon = !!(expires && expires < Date.now() + 300000) // 5 minutes
  const authType = type === 'oauth' ? 'OAuth' : 'API Key'

  const unauthenticatedContent = (
    <>
      <div className="space-y-2">
        <Button onClick={() => login('max')} className="w-full">
          <LogIn className="size-4" />
          Login with Claude Max
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          For Claude Pro/Max subscribers - enables free API access
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <div className="space-y-2">
        <Button variant="outline" onClick={() => login('console')} className="w-full">
          <LogIn className="size-4" />
          Login with Console
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          For developers using Anthropic Console
        </p>
      </div>
    </>
  )

  return (
    <AuthCardBase
      title="Anthropic Authentication"
      description={
        authenticated
          ? 'You are successfully authenticated with Anthropic'
          : 'Choose your authentication method to get started'
      }
      loading={loading}
      error={error}
      authenticated={authenticated}
      expires={expires}
      authType={authType}
      isExpiringSoon={isExpiringSoon}
      onLogout={logout}
      unauthenticatedContent={unauthenticatedContent}
    />
  )
}
