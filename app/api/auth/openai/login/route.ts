import { NextResponse } from 'next/server'
import { CodexAuthenticator } from '@/lib/auth/openai-codex'

export async function POST() {
  try {
    const authenticator = new CodexAuthenticator()

    // Check if already authenticated
    if (await authenticator.isAuthenticated()) {
      return NextResponse.json({
        success: false,
        message: 'Already authenticated',
      })
    }

    // Start the login flow
    const authConfig = await authenticator.loginWithChatGPT()

    return NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        email: authConfig.user_email,
        organization_id: authConfig.organization_id,
        credits_granted: authConfig.credits_granted,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      },
      { status: 500 }
    )
  }
}
