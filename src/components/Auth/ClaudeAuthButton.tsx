"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useClaudeAuth } from "@/src/hooks/useClaudeAuth";
import { cn } from "@/lib/utils";

interface ClaudeAuthButtonProps {
	onSuccess?: (user: any) => void;
	onError?: (error: Error) => void;
	variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
	size?: "default" | "sm" | "lg" | "icon";
	disabled?: boolean;
	className?: string;
}

export function ClaudeAuthButton({
	onSuccess,
	onError,
	variant = "default",
	size = "default",
	disabled = false,
	className,
}: ClaudeAuthButtonProps) {
	const { login, logout, user, isLoading, error } = useClaudeAuth();

	const handleAuthClick = async () => {
		try {
			if (user) {
				await logout();
			} else {
				const result = await login();
				onSuccess?.(result);
			}
		} catch (err) {
			const authError = err instanceof Error ? err : new Error("Authentication failed");
			onError?.(authError);
		}
	};

	return (
		<div className="claude-auth-container">
			<Button
				onClick={handleAuthClick}
				disabled={disabled || isLoading}
				variant={variant}
				size={size}
				className={cn("auth-button", className)}
				data-testid="claude-auth-button"
			>
				{isLoading ? (
					<>
						<span className="loading-spinner" data-testid="loading-spinner" />
						Loading...
					</>
				) : user ? (
					`Sign out ${user.name || user.email || "User"}`
				) : (
					"Sign in with Claude"
				)}
			</Button>
			{error && (
				<div className="error-message text-red-500 text-sm mt-2" data-testid="error-message">
					{error.message}
				</div>
			)}
		</div>
	);
}