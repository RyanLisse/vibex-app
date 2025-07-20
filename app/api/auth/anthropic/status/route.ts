// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { Auth } from '@/lib/auth/index'

export async function GET() {
  try {
    const info = await Auth.get('anthropic')

    if (!info) {
      return NextResponse.json({ authenticated: false })
    }

    const isValid = info.type === 'oauth' && info.expires > Date.now()

    return NextResponse.json({
      authenticated: isValid,
      type: info.type,
      expires: info.type === 'oauth' ? info.expires : undefined,
    })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to check auth status' }, { status: 500 })
  }
}
