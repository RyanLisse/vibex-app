import { useCallback, useEffect, useState } from "react";

interface BaseAuthConfig {
	statusEndpoint: string;
	loginEndpoint?: string;
	logoutEndpoint: string;
	authorizeEndpoint?: string;
}

interface BaseAuthState {
	authenticated: boolean;
	loading: boolean;
	error?: string;
}

export function useAuthBase<T extends BaseAuthState>(
	config: BaseAuthConfig,
	initialState: T,
) {
	const [authStatus, setAuthStatus] = useState<T>(initialState);

	const checkAuthStatus = useCallback(async () => {
		try {
			setAuthStatus((prev) => ({ ...prev, loading: true, error: undefined }));
			const response = await fetch(config.statusEndpoint);

			if (!response.ok) {
				throw new Error("Failed to check auth status");
			}

			const data = await response.json();
			setAuthStatus((prev) => ({
				...prev,
				...data,
				loading: false,
			}));
		} catch (error) {
			setAuthStatus((prev) => ({
				...prev,
				authenticated: false,
				loading: false,
				error: error instanceof Error ? error.message : "Unknown error",
			}));
		}
	}, [config.statusEndpoint]);

	const logout = useCallback(async () => {
		try {
			const response = await fetch(config.logoutEndpoint, {
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Failed to logout");
			}

			await checkAuthStatus();
		} catch (error) {
			setAuthStatus((prev) => ({
				...prev,
				error: error instanceof Error ? error.message : "Logout failed",
			}));
		}
	}, [config.logoutEndpoint, checkAuthStatus]);

	const login = useCallback(
		async (params?: Record<string, string>) => {
			if (config.loginEndpoint) {
				try {
					setAuthStatus((prev) => ({
						...prev,
						loading: true,
						error: undefined,
					}));

					const response = await fetch(config.loginEndpoint, {
						method: "POST",
					});

					const data = await response.json();

					if (!data.success) {
						throw new Error(data.error || data.message);
					}

					await checkAuthStatus();
					return data;
				} catch (error) {
					setAuthStatus((prev) => ({
						...prev,
						loading: false,
						error: error instanceof Error ? error.message : "Login failed",
					}));
					throw error;
				}
			} else if (config.authorizeEndpoint) {
				const queryParams = params
					? new URLSearchParams(params).toString()
					: "";
				const url = queryParams
					? `${config.authorizeEndpoint}?${queryParams}`
					: config.authorizeEndpoint;
				window.location.href = url;
			}
		},
		[config.loginEndpoint, config.authorizeEndpoint, checkAuthStatus],
	);

	useEffect(() => {
		checkAuthStatus();
	}, [checkAuthStatus]);

	return {
		...authStatus,
		login,
		logout,
		refresh: checkAuthStatus,
	};
}
