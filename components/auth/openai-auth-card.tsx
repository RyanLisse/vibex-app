'use client'

import { Button } from '@/components/ui/button'
import { useOpenAIAuth } from '@/hooks/use-openai-auth'
import { LogIn, CreditCard } from 'lucide-react'
import { AuthCardBase } from './auth-card-base'

export function OpenAIAuthCard() {
  const { authenticated, loading, login, logout, expires_at, user, error } = useOpenAIAuth()

  const isExpiringSoon = expires_at && expires_at < Date.now() + 300000 // 5 minutes

  const authenticatedContent = (
    <>
      {user?.organization_id && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Organization:</span>
          <span className="text-sm font-mono">{user.organization_id}</span>
        </div>
      )}

      {user?.credits_granted && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Credits:</span>
          <div className="flex items-center gap-1">
            <CreditCard className="size-3" />
            <span className="text-sm font-semibold text-green-600">{user.credits_granted}</span>
          </div>
        </div>
      )}
    </>
  )

  const unauthenticatedContent = (
    <>
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">Sign in with ChatGPT</h3>
        <p className="text-sm text-blue-700 mb-3">
          This will share your name, email, and profile picture with the application.
        </p>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>• ChatGPT Plus users get 5 free credits</li>
          <li>• ChatGPT Pro users get 50 free credits</li>
          <li>• Automatic API key generation</li>
        </ul>
      </div>

      <Button onClick={login} className="w-full" size="lg">
        <LogIn className="size-4" />
        Sign in with ChatGPT
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        A browser window will open for authentication
      </p>
    </>
  )

  return (
    <AuthCardBase
      title="OpenAI Authentication"
      description={
        authenticated
          ? user?.email || 'Successfully authenticated'
          : 'Sign in with your ChatGPT account to get started'
      }
      loading={loading}
      error={error}
      authenticated={authenticated}
      expires={expires_at}
      authType="ChatGPT OAuth"
      isExpiringSoon={isExpiringSoon}
      onLogout={logout}
      authenticatedContent={authenticatedContent}
      unauthenticatedContent={unauthenticatedContent}
    />
  )
}
