import { useEffect } from "react";
import { useAuthBase } from "@/hooks/use-auth-base";

interface OpenAIAuthStatus {
	authenticated: boolean;
	user?: {
		email?: string;
		organization_id?: string;
		credits_granted?: number;
		created_at?: number;
	};
	expires_at?: number;
	hasRefreshToken?: boolean;
	loading: boolean;
	error?: string;
}

export function useOpenAIAuth() {
	const baseAuth = useAuthBase<OpenAIAuthStatus>(
		{
			statusEndpoint: "/api/auth/openai/status",
			loginEndpoint: "/api/auth/openai/login",
			logoutEndpoint: "/api/auth/openai/logout",
		},
		{
			authenticated: false,
			loading: true,
		},
	);

	const refreshToken = async () => {
		try {
			const response = await fetch("/api/auth/openai/refresh", {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to refresh token");
			}

			await baseAuth.refresh();
		} catch (_error) {}
	};

	useEffect(() => {
		if (
			baseAuth.authenticated &&
			baseAuth.expires_at &&
			baseAuth.hasRefreshToken
		) {
			const timeUntilExpiry = baseAuth.expires_at - Date.now();
			const refreshTime = Math.max(0, timeUntilExpiry - 60_000);

			if (refreshTime > 0) {
				const timeout = setTimeout(() => {
					refreshToken();
				}, refreshTime);

				return () => clearTimeout(timeout);
			}
		}
	}, [
		baseAuth.authenticated,
		baseAuth.expires_at,
		baseAuth.hasRefreshToken,
		refreshToken,
	]);

	return {
		...baseAuth,
		refreshToken,
	};
}
