'use client'

import { useAnthropicAuth } from '@/hooks/use-anthropic-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, LogOut, AlertCircle, Shield } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function AnthropicAuthStatus() {
  const { authenticated, loading, logout, expires, type, error } = useAnthropicAuth()

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm text-muted-foreground">Checking auth...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="size-4 text-red-500" />
        <span className="text-sm text-red-600">Auth Error</span>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="flex items-center gap-2">
        <Shield className="size-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Not authenticated</span>
      </div>
    )
  }

  const isExpiringSoon = expires && expires < Date.now() + 300000 // 5 minutes
  const timeToExpiry = expires ? formatDistanceToNow(expires, { addSuffix: true }) : null

  return (
    <div className="flex items-center gap-2">
      <User className="size-4 text-green-600" />
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        {type === 'oauth' ? 'OAuth' : 'API'}
      </Badge>
      {expires && (
        <span className={`text-xs ${isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {timeToExpiry}
        </span>
      )}
      <Button variant="ghost" size="sm" onClick={logout} className="h-6 px-2">
        <LogOut className="size-3" />
      </Button>
    </div>
  )
}
