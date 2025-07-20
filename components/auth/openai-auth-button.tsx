"use client";

import { Loader2, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOpenAIAuth } from "@/hooks/use-openai-auth";

interface OpenAIAuthButtonProps {
	variant?: "default" | "outline" | "ghost";
	size?: "sm" | "default" | "lg";
}

export function OpenAIAuthButton({
	variant = "default",
	size = "default",
}: OpenAIAuthButtonProps) {
	const { authenticated, loading, login, logout, user } = useOpenAIAuth();

	if (loading) {
		return (
			<Button disabled size={size} variant={variant}>
				<Loader2 className="size-4 animate-spin" />
				Loading...
			</Button>
		);
	}

	if (authenticated) {
		return (
			<div className="flex items-center gap-2">
				<div className="flex items-center gap-1 text-green-600 text-sm">
					<User className="size-4" />
					<span>{user?.email || "OpenAI"}</span>
				</div>
				<Button onClick={logout} size={size} variant="outline">
					<LogOut className="size-4" />
					Logout
				</Button>
			</div>
		);
	}

	return (
		<Button onClick={() => login()} size={size} variant={variant}>
			<LogIn className="size-4" />
			Sign in with ChatGPT
		</Button>
	);
}
