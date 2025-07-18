import { NextResponse } from 'next/server'
import { CodexAuthenticator } from '@/lib/auth/openai-codex'

export async function POST() {
  try {
    const authenticator = new CodexAuthenticator()

    await authenticator.disconnect()

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      },
      { status: 500 }
    )
  }
}
