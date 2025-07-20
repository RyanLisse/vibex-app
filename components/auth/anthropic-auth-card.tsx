"use client";

import { LogIn } from "lucide-react";
import { AuthCardBase } from "@/components/auth/auth-card-base";
import { Button } from "@/components/ui/button";
import { useAnthropicAuth } from "@/hooks/use-anthropic-auth";

export function AnthropicAuthCard() {
	const { authenticated, loading, login, logout, expires, type, error } =
		useAnthropicAuth();

	const isExpiringSoon = !!(expires && expires < Date.now() + 300_000); // 5 minutes
	const authType = type === "oauth" ? "OAuth" : "API Key";

	const unauthenticatedContent = (
		<>
			<div className="space-y-2">
				<Button className="w-full" onClick={() => login("max")}>
					<LogIn className="size-4" />
					Login with Claude Max
				</Button>
				<p className="text-center text-muted-foreground text-xs">
					For Claude Pro/Max subscribers - enables free API access
				</p>
			</div>

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="bg-background px-2 text-muted-foreground">Or</span>
				</div>
			</div>

			<div className="space-y-2">
				<Button
					className="w-full"
					onClick={() => login("console")}
					variant="outline"
				>
					<LogIn className="size-4" />
					Login with Console
				</Button>
				<p className="text-center text-muted-foreground text-xs">
					For developers using Anthropic Console
				</p>
			</div>
		</>
	);

	return (
		<AuthCardBase
			authenticated={authenticated}
			authType={authType}
			description={
				authenticated
					? "You are successfully authenticated with Anthropic"
					: "Choose your authentication method to get started"
			}
			error={error}
			expires={expires}
			isExpiringSoon={isExpiringSoon}
			loading={loading}
			onLogout={logout}
			title="Anthropic Authentication"
			unauthenticatedContent={unauthenticatedContent}
		/>
	);
}
