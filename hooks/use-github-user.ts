"use client";

import type { GitHubUser } from "@/lib/github";
	checkAuthStatus,
	clearAuthCookies,
	getAuthUrl,
	parseCookieValue,
} from "@/lib/github-api";

interface UseGitHubUserReturn {
	isAuthenticated: boolean;
	user: GitHubUser | null;
	isLoading: boolean;
	error: string | null;
	login: () => Promise<void>;
	logout: () => void;
}

interface AuthState {
	isAuthenticated: boolean;
	user: GitHubUser | null;
	isLoading: boolean;
	error: string | null;
}

const POPUP_CHECK_INTERVAL = 1000;
const AUTH_SUCCESS_DELAY = 1000;
const POPUP_CONFIG = {
	width: 600,
	height: 700,
	features: "scrollbars=yes,resizable=yes",
};

export function useGitHubUser(): UseGitHubUserReturn {
	const [authState, setAuthState] = useState<AuthState>({
		isAuthenticated: false,
		user: null,
		isLoading: true,
		error: null,
	});

	const popupCheckInterval = useRef<NodeJS.Timeout | null>(null);

	// Update partial auth state
	const updateAuthState = useCallback((updates: Partial<AuthState>) => {
		setAuthState((prev) => ({ ...prev, ...updates }));
	}, []);

	const parseUserCookie = useCallback((): GitHubUser | null => {
		try {
			const userCookie = parseCookieValue("github_user");
			if (!userCookie) {
				return null;
			}
			return JSON.parse(userCookie);
		} catch (_error) {
			return null;
		}
	}, []);

	const setUnauthenticatedState = useCallback(() => {
		updateAuthState({ isAuthenticated: false, user: null });
	}, [updateAuthState]);

	const setAuthenticatedState = useCallback(
		(userData: GitHubUser) => {
			updateAuthState({ isAuthenticated: true, user: userData });
		},
		[updateAuthState],
	);

	const validateAuth = useCallback(
		async (signal: AbortSignal): Promise<void> => {
			const userData = parseUserCookie();

			if (!userData) {
				setUnauthenticatedState();
				return;
			}

			try {
				const isValid = await checkAuthStatus(signal);

				if (isValid) {
					setAuthenticatedState(userData);
				} else {
					clearAuthCookies();
					setUnauthenticatedState();
				}
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					return;
				}
				throw error;
			}
		},
		[parseUserCookie, setUnauthenticatedState, setAuthenticatedState],
	);

	const checkInitialAuth = useCallback(
		async (signal: AbortSignal): Promise<void> => {
			try {
				updateAuthState({ isLoading: true });
				await validateAuth(signal);
			} catch (_error) {
				setUnauthenticatedState();
			} finally {
				if (!signal.aborted) {
					updateAuthState({ isLoading: false });
				}
			}
		},
		[validateAuth, updateAuthState, setUnauthenticatedState],
	);

	const handleAuthSuccess = useCallback(() => {
		setTimeout(() => {
			const userData = parseUserCookie();
			if (userData) {
				setAuthenticatedState(userData);
				updateAuthState({ isLoading: false });
			} else {
				setUnauthenticatedState();
				updateAuthState({ isLoading: false });
			}
		}, AUTH_SUCCESS_DELAY);
	}, [
		parseUserCookie,
		setAuthenticatedState,
		setUnauthenticatedState,
		updateAuthState,
	]);

	const createPopupWindow = useCallback(
		async (url: string): Promise<Window> => {
			const left = (window.screen.width - POPUP_CONFIG.width) / 2;
			const top = (window.screen.height - POPUP_CONFIG.height) / 2;

			const popup = window.open(
				url,
				"github-oauth",
				`width=${POPUP_CONFIG.width},height=${POPUP_CONFIG.height},left=${left},top=${top},${POPUP_CONFIG.features}`,
			);

			if (!popup) {
				throw new Error("Popup blocked. Please allow popups for this site.");
			}

			return popup;
		},
		[],
	);

	const openAuthPopup = useCallback(async (): Promise<Window | null> => {
		const url = await getAuthUrl();
		return createPopupWindow(url);
	}, [createPopupWindow]);

	const monitorPopup = useCallback(
		(popup: Window): void => {
			popupCheckInterval.current = setInterval(() => {
				if (popup.closed) {
					if (popupCheckInterval.current) {
						clearInterval(popupCheckInterval.current);
						popupCheckInterval.current = null;
					}
					updateAuthState({ isLoading: false });
				}
			}, POPUP_CHECK_INTERVAL);
		},
		[updateAuthState],
	);

	const login = useCallback(async (): Promise<void> => {
		try {
			updateAuthState({ isLoading: true, error: null });
			const popup = await openAuthPopup();
			if (popup) {
				monitorPopup(popup);
			}
		} catch (error) {
			updateAuthState({
				error: error instanceof Error ? error.message : "Authentication failed",
				isLoading: false,
			});
		}
	}, [openAuthPopup, monitorPopup, updateAuthState]);

	const logout = useCallback((): void => {
		clearAuthCookies();
		setUnauthenticatedState();
	}, [setUnauthenticatedState]);

	// Check authentication status on mount
	useEffect(() => {
		const abortController = new AbortController();
		checkInitialAuth(abortController.signal);
		return () => abortController.abort("Component unmounted");
	}, [checkInitialAuth]);

	// Listen for auth success from popup
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "GITHUB_AUTH_SUCCESS") {
				handleAuthSuccess();
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [handleAuthSuccess]);

	// Cleanup popup check interval
	useEffect(() => {
		return () => {
			if (popupCheckInterval.current) {
				clearInterval(popupCheckInterval.current);
			}
		};
	}, []);

	return {
		isAuthenticated: authState.isAuthenticated,
		user: authState.user,
		isLoading: authState.isLoading,
		error: authState.error,
		login,
		logout,
	};
}
