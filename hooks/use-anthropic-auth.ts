import { useAuthBase } from "@/hooks/use-auth-base";

interface AuthStatus {
	authenticated: boolean;
	type?: "oauth" | "api";
	expires?: number;
	loading: boolean;
	error?: string;
}

export function useAnthropicAuth() {
	const baseAuth = useAuthBase<AuthStatus>(
		{
			statusEndpoint: "/api/auth/anthropic/status",
			logoutEndpoint: "/api/auth/anthropic/logout",
			authorizeEndpoint: "/api/auth/anthropic/authorize",
		},
		{
			authenticated: false,
			loading: true,
		},
	);

	const login = (mode: "max" | "console" = "max") => {
		baseAuth.login({ mode });
	};

	return {
		...baseAuth,
		login,
	};
}
