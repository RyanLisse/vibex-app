// Environment variables configuration
export const env = {
  // OpenAI OAuth Configuration
  OPENAI_CLIENT_ID: process.env.OPENAI_CLIENT_ID,
  OPENAI_CLIENT_SECRET: process.env.OPENAI_CLIENT_SECRET,
  OPENAI_REDIRECT_URI: process.env.OPENAI_REDIRECT_URI,
  OPENAI_TOKEN_URL: process.env.OPENAI_TOKEN_URL || 'https://auth0.openai.com/oauth/token',
  OPENAI_AUTH_URL: process.env.OPENAI_AUTH_URL || 'https://auth0.openai.com/authorize',
  OPENAI_REVOKE_URL: process.env.OPENAI_REVOKE_URL || 'https://auth0.openai.com/oauth/revoke',

  // Anthropic OAuth Configuration
  ANTHROPIC_CLIENT_ID: process.env.ANTHROPIC_CLIENT_ID,
  ANTHROPIC_CLIENT_SECRET: process.env.ANTHROPIC_CLIENT_SECRET,
  ANTHROPIC_REDIRECT_URI: process.env.ANTHROPIC_REDIRECT_URI,
  ANTHROPIC_TOKEN_URL: process.env.ANTHROPIC_TOKEN_URL || 'https://auth.anthropic.com/oauth/token',

  // GitHub OAuth Configuration
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI,

  // Next.js Configuration
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

  // Inngest Configuration
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
}

export default env
