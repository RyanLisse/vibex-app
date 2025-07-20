// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { AuthAnthropic } from '@/lib/auth/anthropic'

export async function GET() {
  try {
    const accessToken = await AuthAnthropic.access()

    if (!accessToken) {
      return NextResponse.json({ error: 'No valid access token' }, { status: 401 })
    }

    return NextResponse.json({ access_token: accessToken })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to retrieve access token' }, { status: 500 })
  }
}
