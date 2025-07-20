import { Loader2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import useClaudeAuth from "@/hooks/useClaudeAuth";

interface ClaudeAuthButtonProps {
	clientId: string;
	redirectUri: string;
	onSuccess?: (token: Record<string, unknown>) => void;
	onError?: (error: Error) => void;
	className?: string;
	children?: React.ReactNode;
}

export function ClaudeAuthButton({
	clientId,
	redirectUri,
	onSuccess,
	onError,
	className,
	children = "Sign in with Claude",
}: ClaudeAuthButtonProps) {
	const { startLogin, isAuthenticating, error } = useClaudeAuth({
		clientId,
		redirectUri,
		onSuccess,
		onError,
	});

	// Handle any errors that occur during authentication
	React.useEffect(() => {
		if (error) {
			onError?.(error);
		}
	}, [error, onError]);

	return (
		<Button
			className={className}
			disabled={isAuthenticating}
			onClick={startLogin}
			variant="outline"
		>
			{isAuthenticating ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Authenticating...
				</>
			) : (
				children
			)}
		</Button>
	);
}
