'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useOpenAIAuth } from '@/hooks/use-openai-auth'
import { LogIn, LogOut, User, Shield, Clock, AlertCircle, CreditCard } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function OpenAIAuthCard() {
  const { authenticated, loading, login, logout, expires_at, user, error } = useOpenAIAuth()

  const isExpiringSoon = expires_at && expires_at < Date.now() + 300000 // 5 minutes
  const timeToExpiry = expires_at ? formatDistanceToNow(expires_at, { addSuffix: true }) : null

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            OpenAI Authentication
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
            Authenticated with OpenAI
          </CardTitle>
          <CardDescription>{user?.email || 'Successfully authenticated'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Auth Type:</span>
            <Badge variant="secondary">ChatGPT OAuth</Badge>
          </div>

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

          {expires_at && (
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
          OpenAI Authentication
        </CardTitle>
        <CardDescription>Sign in with your ChatGPT account to get started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  )
}
