"use client";

import { CreditCard, LogIn } from "lucide-react";
import { AuthCardBase } from "@/components/auth/auth-card-base";
import { Button } from "@/components/ui/button";
import { useOpenAIAuth } from "@/hooks/use-openai-auth";

export function OpenAIAuthCard() {
	const { authenticated, loading, login, logout, expires_at, user, error } =
		useOpenAIAuth();

	const isExpiringSoon = !!(expires_at && expires_at < Date.now() + 300_000); // 5 minutes

	const authenticatedContent = (
		<>
			{user?.organization_id && (
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-sm">Organization:</span>
					<span className="font-mono text-sm">{user.organization_id}</span>
				</div>
			)}

			{user?.credits_granted && (
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-sm">Credits:</span>
					<div className="flex items-center gap-1">
						<CreditCard className="size-3" />
						<span className="font-semibold text-green-600 text-sm">
							{user.credits_granted}
						</span>
					</div>
				</div>
			)}
		</>
	);

	const unauthenticatedContent = (
		<>
			<div className="rounded-md bg-blue-50 p-4">
				<h3 className="mb-2 font-semibold text-blue-900">
					Sign in with ChatGPT
				</h3>
				<p className="mb-3 text-blue-700 text-sm">
					This will share your name, email, and profile picture with the
					application.
				</p>
				<ul className="space-y-1 text-blue-600 text-sm">
					<li>• ChatGPT Plus users get 5 free credits</li>
					<li>• ChatGPT Pro users get 50 free credits</li>
					<li>• Automatic API key generation</li>
				</ul>
			</div>

			<Button className="w-full" onClick={() => login()} size="lg">
				<LogIn className="size-4" />
				Sign in with ChatGPT
			</Button>

			<p className="text-center text-muted-foreground text-xs">
				A browser window will open for authentication
			</p>
		</>
	);

	return (
		<AuthCardBase
			authenticated={authenticated}
			authenticatedContent={authenticatedContent}
			authType="ChatGPT OAuth"
			description={
				authenticated
					? user?.email || "Successfully authenticated"
					: "Sign in with your ChatGPT account to get started"
			}
			error={error}
			expires={expires_at}
			isExpiringSoon={isExpiringSoon}
			loading={loading}
			onLogout={logout}
			title="OpenAI Authentication"
			unauthenticatedContent={unauthenticatedContent}
		/>
	);
}
