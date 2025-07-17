'use client'

import { Button } from '@/components/ui/button'
import { useAnthropicAuth } from '@/hooks/use-anthropic-auth'
import { LogIn, LogOut, User } from 'lucide-react'

interface AnthropicAuthButtonProps {
  mode?: 'max' | 'console'
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

export function AnthropicAuthButton({
  mode = 'max',
  variant = 'default',
  size = 'default',
}: AnthropicAuthButtonProps) {
  const { authenticated, loading, login, logout, expires } = useAnthropicAuth()

  if (loading) {
    return (
      <Button variant={variant} size={size} disabled>
        Loading...
      </Button>
    )
  }

  if (authenticated) {
    const isExpiringSoon = expires && expires < Date.now() + 300000 // 5 minutes

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-green-600">
          <User className="size-4" />
          <span>Claude {mode === 'max' ? 'Max' : 'Console'}</span>
          {isExpiringSoon && <span className="text-amber-600">(Expires soon)</span>}
        </div>
        <Button variant="outline" size={size} onClick={logout}>
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    )
  }

  return (
    <Button variant={variant} size={size} onClick={() => login(mode)}>
      <LogIn className="size-4" />
      Login to Claude {mode === 'max' ? 'Max' : 'Console'}
    </Button>
  )
}
