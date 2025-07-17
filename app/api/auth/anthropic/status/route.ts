import { NextResponse } from 'next/server'
import { AuthAnthropic } from '@/lib/auth/anthropic'

export async function GET() {
  try {
    const info = await AuthAnthropic.Auth.get('anthropic')

    if (!info) {
      return NextResponse.json({ authenticated: false })
    }

    const isValid = info.type === 'oauth' && info.expires > Date.now()

    return NextResponse.json({
      authenticated: isValid,
      type: info.type,
      expires: info.type === 'oauth' ? info.expires : undefined,
    })
  } catch (error) {
    console.error('Auth status error:', error)
    return NextResponse.json({ error: 'Failed to check auth status' }, { status: 500 })
  }
}
