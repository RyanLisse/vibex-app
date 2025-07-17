'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAnthropicAuth } from '@/hooks/use-anthropic-auth'
import { LogIn, LogOut, User, Shield, Clock, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function AnthropicAuthCard() {
  const { authenticated, loading, login, logout, expires, type, error } = useAnthropicAuth()

  const isExpiringSoon = expires && expires < Date.now() + 300000 // 5 minutes
  const timeToExpiry = expires ? formatDistanceToNow(expires, { addSuffix: true }) : null

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Anthropic Authentication
          </CardTitle>
          <CardDescription>Checking authentication status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-md border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="size-5" />
            Authentication Error
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (authenticated) {
    return (
      <Card className="w-full max-w-md border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <User className="size-5" />
            Authenticated
          </CardTitle>
          <CardDescription>You are successfully authenticated with Anthropic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Auth Type:</span>
            <Badge variant="secondary">{type === 'oauth' ? 'OAuth' : 'API Key'}</Badge>
          </div>

          {expires && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Expires:</span>
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                <span
                  className={`text-sm ${isExpiringSoon ? 'text-amber-600' : 'text-muted-foreground'}`}
                >
                  {timeToExpiry}
                </span>
              </div>
            </div>
          )}

          {isExpiringSoon && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md">
              <AlertCircle className="size-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Token expires soon. Please re-authenticate.
              </span>
            </div>
          )}

          <Button variant="outline" onClick={logout} className="w-full">
            <LogOut className="size-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          Anthropic Authentication
        </CardTitle>
        <CardDescription>Choose your authentication method to get started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  )
}
