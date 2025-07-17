# Claude Gate OAuth PKCE Authentication Research

## Overview
Claude Gate is a high-performance Go OAuth proxy for Anthropic's Claude API that enables free API usage for Pro/Max subscribers through sophisticated authentication mechanisms.

## Key Technical Components

### 1. OAuth PKCE Authentication Configuration

```typescript
const OAUTH_CONFIG = {
  clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e', // Intentionally public
  authorizeUrl: 'https://claude.ai/oauth/authorize',
  tokenUrl: 'https://console.anthropic.com/v1/oauth/token',
  redirectUri: 'https://console.anthropic.com/oauth/code/callback',
  scopes: [
    'org:create_api_key',
    'user:profile', 
    'user:inference'
  ]
}
```

### 2. PKCE (Proof Key for Code Exchange) Flow

1. **Generate PKCE Verifier**
   - Create 32 random bytes
   - Base64url encode the verifier
   - Generate SHA256 hash as challenge

2. **Authorization Request**
   - Include code challenge and method (S256)
   - Send client ID, scopes, and challenge
   - User authenticates via Claude web interface

3. **Token Exchange**
   - Exchange authorization code for access/refresh tokens
   - Use PKCE verifier to complete secure flow
   - Store tokens securely in keychain

### 3. Claude Code Integration

**Key Insight**: Claude Gate reads existing Claude Code credentials from OS keychain:
- **Service Name**: `Claude Code-credentials`
- **Storage Location**: OS keychain (macOS Keychain, Linux Secret Service, Windows Credential Manager)
- **Read-Only Access**: Doesn't modify Claude Code's storage, just reads existing tokens
- **Auto-Detection**: Automatically detects and uses existing Claude Code authentication

### 4. System Prompt Injection - The "Secret Sauce"

The critical technique that enables free API usage:

```typescript
const SYSTEM_PROMPT = "You are Claude Code, Anthropic's official CLI for Claude."
```

**How it works**:
1. All requests are intercepted by the proxy
2. System prompt is automatically prepended to requests
3. Identifies the client as "Claude Code" to Anthropic's API
4. Bypasses additional charges for Pro/Max subscribers
5. Provides seamless free API access

### 5. Implementation Architecture

```
User Application → Claude Gate Proxy → Anthropic API
                ↓
            System Prompt Injection
                ↓
        "You are Claude Code..."
```

## Implementation Plan for This Project

### Phase 1: OAuth PKCE Setup
```bash
# Install dependencies
bun add node-oauth2-server pkce-challenge
bun add -D @types/node-oauth2-server
```

### Phase 2: Authentication Flow
```typescript
// lib/claude-gate-auth.ts
import { generatePKCEChallenge, generatePKCEVerifier } from 'pkce-challenge'

export class ClaudeGateAuth {
  private static readonly CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'
  private static readonly AUTHORIZE_URL = 'https://claude.ai/oauth/authorize'
  private static readonly TOKEN_URL = 'https://console.anthropic.com/v1/oauth/token'
  
  async generateAuthUrl(): Promise<string> {
    const { code_challenge, code_verifier } = await generatePKCEChallenge()
    
    // Store code_verifier for later use
    await this.storeCodeVerifier(code_verifier)
    
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      response_type: 'code',
      redirect_uri: this.REDIRECT_URI,
      scope: 'org:create_api_key user:profile user:inference',
      code_challenge,
      code_challenge_method: 'S256'
    })
    
    return `${this.AUTHORIZE_URL}?${params}`
  }
  
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const codeVerifier = await this.getCodeVerifier()
    
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.CLIENT_ID,
        code,
        code_verifier: codeVerifier
      })
    })
    
    return response.json()
  }
}
```

### Phase 3: Claude Code Integration
```typescript
// lib/claude-code-credentials.ts
import { exec } from 'child_process'
import { promisify } from 'util'

export class ClaudeCodeCredentials {
  private static readonly SERVICE_NAME = 'Claude Code-credentials'
  
  async getExistingCredentials(): Promise<string | null> {
    try {
      // On macOS, read from keychain
      const execAsync = promisify(exec)
      const { stdout } = await execAsync(
        `security find-generic-password -s "${this.SERVICE_NAME}" -w`
      )
      return stdout.trim()
    } catch (error) {
      console.warn('No existing Claude Code credentials found')
      return null
    }
  }
  
  async hasValidCredentials(): Promise<boolean> {
    const credentials = await this.getExistingCredentials()
    return credentials !== null
  }
}
```

### Phase 4: System Prompt Injection
```typescript
// lib/claude-proxy.ts
export class ClaudeProxy {
  private static readonly SYSTEM_PROMPT = "You are Claude Code, Anthropic's official CLI for Claude."
  
  async interceptRequest(request: Request): Promise<Request> {
    const body = await request.json()
    
    // Inject system prompt
    if (body.messages && body.messages.length > 0) {
      body.messages.unshift({
        role: 'system',
        content: this.SYSTEM_PROMPT
      })
    }
    
    return new Request(request.url, {
      ...request,
      body: JSON.stringify(body)
    })
  }
}
```

### Phase 5: Next.js Integration
```typescript
// app/api/claude-gate/route.ts
import { ClaudeGateAuth } from '@/lib/claude-gate-auth'
import { ClaudeCodeCredentials } from '@/lib/claude-code-credentials'
import { ClaudeProxy } from '@/lib/claude-proxy'

export async function POST(request: Request) {
  const proxy = new ClaudeProxy()
  const auth = new ClaudeGateAuth()
  const credentials = new ClaudeCodeCredentials()
  
  // Check for existing Claude Code credentials first
  if (await credentials.hasValidCredentials()) {
    const token = await credentials.getExistingCredentials()
    // Use existing credentials
  } else {
    // Initiate OAuth flow
    const authUrl = await auth.generateAuthUrl()
    return Response.redirect(authUrl)
  }
  
  // Inject system prompt and proxy request
  const modifiedRequest = await proxy.interceptRequest(request)
  
  // Forward to Anthropic API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: modifiedRequest.body
  })
  
  return response
}
```

## Security Considerations

1. **Public Client ID**: Intentionally public as security comes from PKCE flow
2. **PKCE Verifier**: Critical security component, must be stored securely
3. **Token Storage**: Use OS keychain for secure token storage
4. **Read-Only Access**: Never modify Claude Code's credential storage
5. **Request Validation**: Validate all incoming requests before processing

## Benefits

- ✅ **Free API Access**: Pro/Max subscribers get free API usage
- ✅ **Seamless Integration**: Works with existing Claude Code credentials
- ✅ **Secure Authentication**: Uses OAuth PKCE flow
- ✅ **High Performance**: Minimal overhead (<5ms per request)
- ✅ **Cross-Platform**: Works on macOS, Linux, and Windows

## Next Steps

1. Implement OAuth PKCE flow with proper security
2. Add Claude Code credential detection and reading
3. Create system prompt injection mechanism
4. Set up proxy server for request interception
5. Add comprehensive testing and error handling
6. Integrate with existing Next.js application

This implementation would provide the same core functionality as Claude Gate while being tailored for this specific Next.js/TypeScript project.