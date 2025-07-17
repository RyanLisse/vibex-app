'use client'

import { Button } from '@/components/ui/button'
import { useOpenAIAuth } from '@/hooks/use-openai-auth'
import { LogIn, LogOut, User, Loader2 } from 'lucide-react'

interface OpenAIAuthButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

export function OpenAIAuthButton({ variant = 'default', size = 'default' }: OpenAIAuthButtonProps) {
  const { authenticated, loading, login, logout, user } = useOpenAIAuth()

  if (loading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  if (authenticated) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-green-600">
          <User className="size-4" />
          <span>{user?.email || 'OpenAI'}</span>
        </div>
        <Button variant="outline" size={size} onClick={logout}>
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    )
  }

  return (
    <Button variant={variant} size={size} onClick={login}>
      <LogIn className="size-4" />
      Sign in with ChatGPT
    </Button>
  )
}
