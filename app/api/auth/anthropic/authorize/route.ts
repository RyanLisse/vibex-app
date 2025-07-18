import { type NextRequest, NextResponse } from 'next/server'
import { AuthAnthropic } from '@/lib/auth/anthropic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mode = (searchParams.get('mode') as 'max' | 'console') || 'max'

    const { url, verifier } = await AuthAnthropic.authorize(mode)

    // Store the verifier in session/cookie for later use
    const response = NextResponse.redirect(url)
    response.cookies.set('oauth_verifier', verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error) {
    console.error('OAuth authorization error:', error)
    return NextResponse.json({ error: 'Failed to initiate OAuth flow' }, { status: 500 })
  }
}
