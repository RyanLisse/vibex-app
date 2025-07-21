"use client";

import { useState, useEffect, useCallback } from "react";

type ConnectionState = "connected" | "disconnected" | "connecting" | "error";

interface ConnectionInfo {
	state: ConnectionState;
	lastConnected?: Date;
	lastError?: string;
	retryCount: number;
}

interface UseConnectionStateOptions {
	url?: string;
	autoReconnect?: boolean;
	maxRetries?: number;
	retryDelay?: number;
}

export function useConnectionState({
	url,
	autoReconnect = true,
	maxRetries = 3,
	retryDelay = 2000,
}: UseConnectionStateOptions = {}) {
	const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
		state: "disconnected",
		retryCount: 0,
	});

	const updateConnectionState = useCallback(
		(state: ConnectionState, error?: string) => {
			setConnectionInfo((prev) => ({
				...prev,
				state,
				lastError: error,
				lastConnected: state === "connected" ? new Date() : prev.lastConnected,
			}));
		},
		[],
	);

	const connect = useCallback(async () => {
		if (!url) return;

		updateConnectionState("connecting");

		try {
			// Simulate connection check
			const response = await fetch(url, { method: "HEAD" });
			if (response.ok) {
				updateConnectionState("connected");
				setConnectionInfo((prev) => ({ ...prev, retryCount: 0 }));
			} else {
				throw new Error(`Connection failed: ${response.status}`);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			updateConnectionState("error", errorMessage);

			if (autoReconnect && connectionInfo.retryCount < maxRetries) {
				setConnectionInfo((prev) => ({
					...prev,
					retryCount: prev.retryCount + 1,
				}));
				setTimeout(connect, retryDelay);
			}
		}
	}, [
		url,
		autoReconnect,
		maxRetries,
		retryDelay,
		connectionInfo.retryCount,
		updateConnectionState,
	]);

	const disconnect = useCallback(() => {
		updateConnectionState("disconnected");
		setConnectionInfo((prev) => ({ ...prev, retryCount: 0 }));
	}, [updateConnectionState]);

	const reconnect = useCallback(() => {
		setConnectionInfo((prev) => ({ ...prev, retryCount: 0 }));
		connect();
	}, [connect]);

	useEffect(() => {
		if (url && autoReconnect) {
			connect();
		}

		return () => {
			disconnect();
		};
	}, [url, autoReconnect, connect, disconnect]);

	return {
		...connectionInfo,
		connect,
		disconnect,
		reconnect,
		isConnected: connectionInfo.state === "connected",
		isConnecting: connectionInfo.state === "connecting",
	};
}
