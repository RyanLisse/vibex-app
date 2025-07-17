import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import useClaudeAuth from '@/hooks/useClaudeAuth'

interface ClaudeAuthButtonProps {
  clientId: string
  redirectUri: string
  onSuccess?: (token: Record<string, unknown>) => void
  onError?: (error: Error) => void
  className?: string
  children?: React.ReactNode
}

export function ClaudeAuthButton({
  clientId,
  redirectUri,
  onSuccess,
  onError,
  className,
  children = 'Sign in with Claude',
}: ClaudeAuthButtonProps) {
  const { startLogin, isAuthenticating, error } = useClaudeAuth({
    clientId,
    redirectUri,
    onSuccess,
    onError,
  })

  // Handle any errors that occur during authentication
  React.useEffect(() => {
    if (error) {
      console.error('Authentication error:', error)
      onError?.(error)
    }
  }, [error, onError])

  return (
    <Button
      onClick={startLogin}
      disabled={isAuthenticating}
      className={className}
      variant="outline"
    >
      {isAuthenticating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Authenticating...
        </>
      ) : (
        children
      )}
    </Button>
  )
}
