# Claude OAuth PKCE Authentication

This module provides a secure OAuth PKCE (Proof Key for Code Exchange) implementation for authenticating with Claude Pro/Max accounts.

## Features

- OAuth 2.0 with PKCE (Proof Key for Code Exchange)
- Secure token management
- React hook for easy integration
- TypeScript support
- Refresh token support

## Installation

No additional installation is required as this is part of your project. The implementation uses standard Web APIs and React hooks.

## Usage

### Basic Usage with React Hook

```tsx
import { useClaudeAuth } from '@/hooks/useClaudeAuth';

function MyComponent() {
  const { startLogin, isAuthenticating, error } = useClaudeAuth({
    clientId: 'your-client-id', // Use environment variables in production
    redirectUri: window.location.origin + '/auth/callback', // Your callback URL
    onSuccess: (token) => {
      // Handle successful authentication
      console.log('Authentication successful', token);
    },
    onError: (error) => {
      // Handle errors
      console.error('Authentication error', error);
    },
  });

  return (
    <div>
      <button 
        onClick={startLogin} 
        disabled={isAuthenticating}
      >
        {isAuthenticating ? 'Signing in...' : 'Sign in with Claude'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </div>
  );
}
```

### Using the Pre-built Button Component

```tsx
import { ClaudeAuthButton } from '@/components/Auth/ClaudeAuthButton';

function LoginPage() {
  return (
    <div className="login-container">
      <h1>Welcome to My App</h1>
      <ClaudeAuthButton 
        clientId={process.env.NEXT_PUBLIC_CLAUDE_CLIENT_ID}
        redirectUri={`${window.location.origin}/auth/callback`}
        onSuccess={(token) => {
          // Store the token in your state management
          console.log('Authentication successful', token);
        }}
      />
    </div>
  );
}
```

### Server-Side Authentication (Next.js API Route Example)

```typescript
// pages/api/auth/callback.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { ClaudeAuthClient } from '@/lib/auth/claude-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state' });
  }

  try {
    const authClient = new ClaudeAuthClient({
      clientId: process.env.CLAUDE_CLIENT_ID!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    });

    // Get the verifier from your session or database
    const verifier = await getVerifierFromSession(state as string);
    
    if (!verifier) {
      return res.status(400).json({ error: 'Invalid state' });
    }

    const token = await authClient.exchangeCodeForToken(
      code as string,
      verifier
    );

    // Store the token securely (httpOnly cookie recommended)
    setAuthCookies(res, token);

    // Redirect to the app
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
```

## Configuration

### Environment Variables

```env
# Required
NEXT_PUBLIC_CLAUDE_CLIENT_ID=your-client-id
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (for server-side)
CLAUDE_CLIENT_SECRET=your-client-secret
```

### AuthClient Configuration

The `ClaudeAuthClient` accepts the following configuration options:

```typescript
interface AuthConfig {
  clientId: string;           // Required: Your OAuth client ID
  redirectUri: string;        // Required: Your redirect URI
  scopes?: string[];          // Optional: Array of OAuth scopes
  authorizeUrl?: string;      // Optional: Defaults to Claude's OAuth URL
  tokenUrl?: string;          // Optional: Defaults to Claude's token URL
}
```

## Security Considerations

1. **PKCE**: This implementation uses PKCE (Proof Key for Code Exchange) which is the recommended flow for public clients.
2. **Token Storage**: Never store access tokens in localStorage. Use httpOnly cookies or secure server-side sessions.
3. **Client ID**: The client ID is public by design in PKCE flows.
4. **Redirect URIs**: Always validate redirect URIs on the server side.
5. **State Parameter**: The implementation includes CSRF protection via the state parameter.

## Error Handling

The `useClaudeAuth` hook provides an `error` state that you can use to display error messages to users. Common errors include:

- `invalid_grant`: The authorization code or refresh token is invalid or expired
- `invalid_client`: The client ID is invalid
- `invalid_scope`: The requested scope is invalid or insufficient
- `access_denied`: The user denied the authorization request

## License

This code is part of your project and follows the same license as the rest of your codebase.
