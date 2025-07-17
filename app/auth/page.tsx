import { AnthropicAuthCard } from '@/components/auth/anthropic-auth-card'

export default function AuthPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Authentication</h1>
          <p className="text-sm text-muted-foreground">
            Connect your Anthropic account to get started
          </p>
        </div>
        <AnthropicAuthCard />
      </div>
    </div>
  )
}
