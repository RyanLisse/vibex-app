import { NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'

export async function POST() {
  try {
    await Auth.remove('anthropic')

    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}
