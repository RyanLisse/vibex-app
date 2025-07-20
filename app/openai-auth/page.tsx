import { OpenAIAuthCard } from "@/components/auth/openai-auth-card";

export default function OpenAIAuthPage() {
	return (
		<div className="container flex min-h-screen items-center justify-center py-12">
			<div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
				<div className="flex flex-col space-y-2 text-center">
					<h1 className="font-semibold text-2xl tracking-tight">
						OpenAI Authentication
					</h1>
					<p className="text-muted-foreground text-sm">
						Sign in with your ChatGPT account
					</p>
				</div>
				<OpenAIAuthCard />
				<div className="text-center">
					<p className="text-muted-foreground text-xs">
						By signing in, you agree to OpenAI&apos;s Terms of Service and
						Privacy Policy
					</p>
				</div>
			</div>
		</div>
	);
}
