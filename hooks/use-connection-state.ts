"use client";

import { useCallback, useEffect, useState } from "react";

export type ConnectionStatus = "online" | "offline" | "connecting" | "error";

export interface ConnectionState {
	status: ConnectionStatus;
	isOnline: boolean;
	lastConnected: Date | null;
	retryCount: number;
	error: string | null;
}

export interface ConnectionActions {
	reconnect: () => void;
	reset: () => void;
}

export interface UseConnectionStateReturn extends ConnectionState, ConnectionActions {}

/**
 * Hook for managing connection state and network status
 *
 * Monitors online/offline status and provides connection management
 * with automatic retry logic and error handling.
 */
export function useConnectionState(): UseConnectionStateReturn {
	const [status, setStatus] = useState<ConnectionStatus>("online");
	const [lastConnected, setLastConnected] = useState<Date | null>(new Date());
	const [retryCount, setRetryCount] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const isOnline = status === "online";

	const handleOnline = useCallback(() => {
		setStatus("online");
		setLastConnected(new Date());
		setRetryCount(0);
		setError(null);
	}, []);

	const handleOffline = useCallback(() => {
		setStatus("offline");
		setError("Network connection lost");
	}, []);

	const reconnect = useCallback(() => {
		if (status === "offline" || status === "error") {
			setStatus("connecting");
			setRetryCount((prev) => prev + 1);
			setError(null);

			// Simulate connection attempt
			setTimeout(() => {
				if (navigator.onLine) {
					handleOnline();
				} else {
					setStatus("error");
					setError("Failed to reconnect");
				}
			}, 1000);
		}
	}, [status, handleOnline]);

	const reset = useCallback(() => {
		setStatus(navigator.onLine ? "online" : "offline");
		setLastConnected(navigator.onLine ? new Date() : null);
		setRetryCount(0);
		setError(null);
	}, []);

	useEffect(() => {
		// Set initial status based on navigator.onLine
		setStatus(navigator.onLine ? "online" : "offline");
		setLastConnected(navigator.onLine ? new Date() : null);

		// Add event listeners for online/offline events
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [handleOnline, handleOffline]);

	return {
		status,
		isOnline,
		lastConnected,
		retryCount,
		error,
		reconnect,
		reset,
	};
}

export default useConnectionState;
