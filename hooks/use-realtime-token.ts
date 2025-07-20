import { useCallback, useEffect, useRef, useState } from "react";
import {
	fetchRealtimeSubscriptionToken,
	type TaskChannelToken,
} from "@/app/actions/inngest";

export interface UseRealtimeTokenReturn {
	token: TaskChannelToken | null;
	refreshToken: () => Promise<TaskChannelToken | null>;
	isEnabled: boolean;
	error: Error | null;
}

export function useRealtimeToken(): UseRealtimeTokenReturn {
	const [token, setToken] = useState<TaskChannelToken | null>(null);
	const [isEnabled, setIsEnabled] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const refreshAttempts = useRef(0);
	const maxRetries = 3;

	const refreshToken =
		useCallback(async (): Promise<TaskChannelToken | null> => {
			try {
				setError(null);
				const newToken = await fetchRealtimeSubscriptionToken();

				if (!newToken) {
					setIsEnabled(false);
					refreshAttempts.current = 0;
					return null;
				}

				setToken(newToken);
				setIsEnabled(true);
				refreshAttempts.current = 0;
				return newToken;
			} catch (err) {
				const error =
					err instanceof Error ? err : new Error("Failed to refresh token");

				refreshAttempts.current += 1;

				if (refreshAttempts.current >= maxRetries) {
					setIsEnabled(false);
					setError(error);
					refreshAttempts.current = 0;
				}

				return null;
			}
		}, []);

	// Initial token fetch
	useEffect(() => {
		refreshToken();
	}, [refreshToken]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			setIsEnabled(false);
			setToken(null);
			setError(null);
			refreshAttempts.current = 0;
		};
	}, []);

	return {
		token,
		refreshToken,
		isEnabled,
		error,
	};
}
