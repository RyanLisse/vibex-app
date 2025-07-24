"use client";

import { useCallback } from "react";
import { useAuthBase } from "./use-auth-base";

/**
 * OpenAI authentication hook
 * Provides authentication functionality for OpenAI services
 */
export function useOpenAIAuth() {
	const baseAuth = useAuthBase(
		{
			statusEndpoint: "/api/auth/openai/status",
			loginEndpoint: "/api/auth/openai/login",
			logoutEndpoint: "/api/auth/openai/logout",
			provider: "openai",
		},
		{
			authenticated: false,
			loading: true,
		}
	);

	// OpenAI-specific token refresh functionality
	const refreshToken = useCallback(async () => {
		try {
			const response = await fetch("/api/auth/openai/refresh", {
				method: "POST",
			});

			if (response.ok) {
				// Call the base auth refresh to update state
				await baseAuth.refresh();
			} else {
				throw new Error(`Token refresh failed with status ${response.status}`);
			}
		} catch (error) {
			console.error("Token refresh failed:", error);
			// Don't call base refresh on error
		}
	}, [baseAuth.refresh]);

	return {
		...baseAuth,
		refreshToken,
	};
}
