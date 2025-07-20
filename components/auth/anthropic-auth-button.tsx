"use client";

import { LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnthropicAuth } from "@/hooks/use-anthropic-auth";

interface AnthropicAuthButtonProps {
	mode?: "max" | "console";
	variant?: "default" | "outline" | "ghost";
	size?: "sm" | "default" | "lg";
}

export function AnthropicAuthButton({
	mode = "max",
	variant = "default",
	size = "default",
}: AnthropicAuthButtonProps) {
	const { authenticated, loading, login, logout, expires } = useAnthropicAuth();

	if (loading) {
		return (
			<Button disabled size={size} variant={variant}>
				Loading...
			</Button>
		);
	}

	if (authenticated) {
		const isExpiringSoon = expires && expires < Date.now() + 300_000; // 5 minutes

		return (
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1 text-green-600 text-sm">
					<User className="size-4" />
					<span>Claude {mode === "max" ? "Max" : "Console"}</span>
					{isExpiringSoon && (
						<span className="text-amber-600">(Expires soon)</span>
					)}
				</div>
				<Button onClick={logout} size={size} variant="outline">
					<LogOut className="size-4" />
					Logout
				</Button>
			</div>
		);
	}

	return (
		<Button onClick={() => login(mode)} size={size} variant={variant}>
			<LogIn className="size-4" />
			Login to Claude {mode === "max" ? "Max" : "Console"}
		</Button>
	);
}
