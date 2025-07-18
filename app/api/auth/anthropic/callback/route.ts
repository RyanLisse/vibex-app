import { type NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { AuthAnthropic } from '@/lib/auth/anthropic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const verifier = request.cookies.get('oauth_verifier')?.value

    if (!(code && verifier)) {
      return NextResponse.json({ error: 'Missing code or verifier' }, { status: 400 })
    }

    const tokens = await AuthAnthropic.exchange(code, verifier)

    // Store tokens securely
    await Auth.set('anthropic', {
      type: 'oauth',
      refresh: tokens.refresh,
      access: tokens.access,
      expires: tokens.expires,
    })

    // Clear the verifier cookie
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('oauth_verifier')

    return response
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to complete OAuth flow' }, { status: 500 })
  }
}
