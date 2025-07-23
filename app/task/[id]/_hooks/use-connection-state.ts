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

// Configuration object to reduce parameter complexity
interface ConnectionConfig {
	url?: string;
	autoReconnect?: boolean;
	maxRetries?: number;
	retryDelay?: number;
}

// Extract connection logic to separate hooks for better separation of concerns
function useConnectionActions(connectionInfo: ConnectionInfo, config: Required<ConnectionConfig>) {
	const { url, autoReconnect, maxRetries, retryDelay } = config;

	const updateConnectionState = useCallback(
		(state: ConnectionState, error?: string) => {
			return {
				...connectionInfo,
				state,
				lastError: error,
				lastConnected: state === "connected" ? new Date() : connectionInfo.lastConnected,
			};
		},
		[connectionInfo],
	);

	return { updateConnectionState };
}

function useConnectionRetry(connectionInfo: ConnectionInfo, config: Required<ConnectionConfig>) {
	const { maxRetries, retryDelay, autoReconnect } = config;

	const shouldRetry = useCallback(() => {
		return autoReconnect && connectionInfo.retryCount < maxRetries;
	}, [autoReconnect, connectionInfo.retryCount, maxRetries]);

	const incrementRetryCount = useCallback(() => {
		return { ...connectionInfo, retryCount: connectionInfo.retryCount + 1 };
	}, [connectionInfo]);

	const resetRetryCount = useCallback(() => {
		return { ...connectionInfo, retryCount: 0 };
	}, [connectionInfo]);

	return { shouldRetry, incrementRetryCount, resetRetryCount, retryDelay };
}

export function useConnectionState(options: UseConnectionStateOptions = {}) {
	// Normalize config with defaults
	const config: Required<ConnectionConfig> = {
		url: options.url || '',
		autoReconnect: options.autoReconnect ?? true,
		maxRetries: options.maxRetries ?? 3,
		retryDelay: options.retryDelay ?? 2000,
	};

	const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
		state: "disconnected",
		retryCount: 0,
	});

	const { updateConnectionState } = useConnectionActions(connectionInfo, config);
	const { shouldRetry, incrementRetryCount, resetRetryCount, retryDelay } = useConnectionRetry(connectionInfo, config);

	// Simplified connection logic
	const performConnection = useCallback(async () => {
		if (!config.url) return false;

		try {
			const response = await fetch(config.url, { method: "HEAD" });
			return response.ok;
		} catch {
			return false;
		}
	}, [config.url]);

	const connect = useCallback(async () => {
		if (!config.url) return;

		setConnectionInfo(updateConnectionState("connecting"));

		const isConnected = await performConnection();
		
		if (isConnected) {
			setConnectionInfo(resetRetryCount());
			setConnectionInfo(prev => updateConnectionState("connected"));
		} else {
			const errorMessage = "Connection failed";
			setConnectionInfo(prev => updateConnectionState("error", errorMessage));

			if (shouldRetry()) {
				setConnectionInfo(incrementRetryCount());
				setTimeout(connect, retryDelay);
			}
		}
	}, [config.url, updateConnectionState, resetRetryCount, performConnection, shouldRetry, incrementRetryCount, retryDelay]);

	const disconnect = useCallback(() => {
		setConnectionInfo(updateConnectionState("disconnected"));
		setConnectionInfo(resetRetryCount());
	}, [updateConnectionState, resetRetryCount]);

	const reconnect = useCallback(() => {
		setConnectionInfo(resetRetryCount());
		connect();
	}, [resetRetryCount, connect]);

	useEffect(() => {
		if (config.url && config.autoReconnect) {
			connect();
		}

		return disconnect;
	}, [config.url, config.autoReconnect, connect, disconnect]);

	return {
		...connectionInfo,
		connect,
		disconnect,
		reconnect,
		isConnected: connectionInfo.state === "connected",
		isConnecting: connectionInfo.state === "connecting",
	};
}
