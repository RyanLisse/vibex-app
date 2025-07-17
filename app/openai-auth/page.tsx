import { OpenAIAuthCard } from '@/components/auth/openai-auth-card'

export default function OpenAIAuthPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">OpenAI Authentication</h1>
          <p className="text-sm text-muted-foreground">Sign in with your ChatGPT account</p>
        </div>
        <OpenAIAuthCard />
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to OpenAI&apos;s Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
