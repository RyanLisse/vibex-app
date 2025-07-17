import { NextResponse } from 'next/server'
import { AuthAnthropic } from '@/lib/auth/anthropic'

export async function POST() {
  try {
    await AuthAnthropic.Auth.remove('anthropic')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}
