"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchRealtimeSubscriptionToken } from "@/app/actions/inngest";

export interface RealtimeToken {
	token: string;
	endpoint: string;
	expiresAt?: Date;
}

export interface UseRealtimeTokenOptions {
	taskId?: string;
	userId?: string;
	autoRefresh?: boolean;
	refreshBuffer?: number; // Minutes before expiry to refresh
	onTokenRefresh?: (token: RealtimeToken) => void;
	onError?: (error: Error) => void;
}

export interface UseRealtimeTokenReturn {
	token: RealtimeToken | null;
	isLoading: boolean;
	error: string | null;
	fetchToken: () => Promise<void>;
	refreshToken: () => Promise<void>;
	clearToken: () => void;
	isExpired: boolean;
	isExpiringSoon: boolean;
}

export function useRealtimeToken(options: UseRealtimeTokenOptions = {}): UseRealtimeTokenReturn {
	const [token, setToken] = useState<RealtimeToken | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		taskId,
		userId,
		autoRefresh = true,
		refreshBuffer = 5,
		onTokenRefresh,
		onError,
	} = options;

	const generateMockUserId = useCallback(() => {
		return `user-${Math.random().toString(36).substr(2, 9)}`;
	}, []);

	const fetchToken = useCallback(async () => {
		if (!taskId) {
			setError("Task ID is required");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const effectiveUserId = userId || generateMockUserId();
			const tokenData = await fetchRealtimeSubscriptionToken(taskId, effectiveUserId);

			const newToken: RealtimeToken = {
				token: tokenData.token,
				endpoint: tokenData.endpoint,
				expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Assume 1 hour expiry
			};

			setToken(newToken);
			onTokenRefresh?.(newToken);
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Failed to fetch token");
			setError(error.message);
			onError?.(error);
		} finally {
			setIsLoading(false);
		}
	}, [taskId, userId, generateMockUserId, onTokenRefresh, onError]);

	const refreshToken = useCallback(async () => {
		await fetchToken();
	}, [fetchToken]);

	const clearToken = useCallback(() => {
		setToken(null);
		setError(null);
	}, []);

	const isExpired = useCallback(() => {
		if (!token?.expiresAt) return false;
		return token.expiresAt <= new Date();
	}, [token]);

	const isExpiringSoon = useCallback(() => {
		if (!token?.expiresAt) return false;
		const bufferTime = refreshBuffer * 60 * 1000; // Convert minutes to milliseconds
		return token.expiresAt <= new Date(Date.now() + bufferTime);
	}, [token, refreshBuffer]);

	// Auto-fetch token when taskId changes
	useEffect(() => {
		if (taskId) {
			fetchToken();
		} else {
			clearToken();
		}
	}, [taskId, fetchToken, clearToken]);

	// Auto-refresh logic
	useEffect(() => {
		if (!autoRefresh || !token?.expiresAt) return;

		const checkAndRefresh = () => {
			if (isExpiringSoon()) {
				refreshToken();
			}
		};

		// Check every minute
		const interval = setInterval(checkAndRefresh, 60 * 1000);

		// Initial check
		checkAndRefresh();

		return () => clearInterval(interval);
	}, [autoRefresh, token, isExpiringSoon, refreshToken]);

	return {
		token,
		isLoading,
		error,
		fetchToken,
		refreshToken,
		clearToken,
		isExpired: isExpired(),
		isExpiringSoon: isExpiringSoon(),
	};
}
