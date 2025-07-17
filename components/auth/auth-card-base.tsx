'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertCircle, User, Clock, LogOut } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AuthCardBaseProps {
  title: string
  description?: string
  loading: boolean
  error?: string | null
  authenticated: boolean
  expires?: number | null
  authType?: string
  isExpiringSoon?: boolean
  onLogout: () => void
  onRetry?: () => void
  children?: ReactNode
  authenticatedContent?: ReactNode
  unauthenticatedContent?: ReactNode
}

export function AuthCardBase({
  title,
  description,
  loading,
  error,
  authenticated,
  expires,
  authType,
  isExpiringSoon,
  onLogout,
  onRetry,
  children,
  authenticatedContent,
  unauthenticatedContent,
}: AuthCardBaseProps) {
  const timeToExpiry = expires ? formatDistanceToNow(expires, { addSuffix: true }) : null

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            {title}
          </CardTitle>
          <CardDescription>{description || 'Checking authentication status...'}</CardDescription>
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
          <Button
            variant="outline"
            onClick={onRetry || (() => window.location.reload())}
            className="w-full"
          >
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
            {title.replace('Authentication', 'Authenticated')}
          </CardTitle>
          <CardDescription>{description || 'Successfully authenticated'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authType && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auth Type:</span>
              <Badge variant="secondary">{authType}</Badge>
            </div>
          )}

          {authenticatedContent}

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

          <Button variant="outline" onClick={onLogout} className="w-full">
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
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unauthenticatedContent}
        {children}
      </CardContent>
    </Card>
  )
}
