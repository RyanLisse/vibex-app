import { useCallback, useEffect, useState } from "react";
import { fetchRealtimeSubscriptionToken, type TaskChannelToken } from "@/app/actions/inngest";

interface UseTaskSubscriptionProps {
	taskId: string;
	onMessage?: (message: unknown) => void;
	onStatusUpdate?: (status: unknown) => void;
}

interface UseTaskSubscriptionReturn {
	isConnected: boolean;
	error: Error | null;
	disconnect: () => void;
	reconnect: () => void;
}

// Helper functions to reduce hook complexity
function createWebSocketConnection(token: string): WebSocket {
	return new WebSocket(`ws://localhost:3000/api/realtime?token=${token}`);
}

function setupWebSocketHandlers(
	ws: WebSocket,
	setters: {
		setIsConnected: (connected: boolean) => void;
		setError: (error: Error | null) => void;
	},
	callbacks: {
		onMessage?: (message: unknown) => void;
		onStatusUpdate?: (status: unknown) => void;
	}
) {
	ws.onopen = () => {
		setters.setIsConnected(true);
		setters.setError(null);
	};

	ws.onmessage = (event) => {
		handleWebSocketMessage(event, callbacks);
	};

	ws.onerror = () => {
		setters.setError(new Error("WebSocket connection error"));
		setters.setIsConnected(false);
	};

	ws.onclose = () => {
		setters.setIsConnected(false);
	};
}

function handleWebSocketMessage(
	event: MessageEvent,
	callbacks: {
		onMessage?: (message: unknown) => void;
		onStatusUpdate?: (status: unknown) => void;
	}
) {
	try {
		const data = JSON.parse(event.data);
		if (data.type === "message" && callbacks.onMessage) {
			callbacks.onMessage(data.payload);
		} else if (data.type === "status" && callbacks.onStatusUpdate) {
			callbacks.onStatusUpdate(data.payload);
		}
	} catch (err) {
		console.error("Failed to parse WebSocket message:", err);
	}
}

async function establishConnection(
	taskId: string,
	setters: {
		setConnection: (ws: WebSocket | null) => void;
		setError: (error: Error | null) => void;
		setIsConnected: (connected: boolean) => void;
	},
	callbacks: {
		onMessage?: (message: unknown) => void;
		onStatusUpdate?: (status: unknown) => void;
	}
): Promise<void> {
	try {
		const token = await fetchRealtimeSubscriptionToken(taskId);
		if (!token) {
			throw new Error("Failed to get subscription token");
		}

		// Create and setup WebSocket connection
		const ws = createWebSocketConnection(token);
		setupWebSocketHandlers(ws, setters, callbacks);
		setters.setConnection(ws);
	} catch (err) {
		setters.setError(err instanceof Error ? err : new Error("Connection failed"));
	}
}

/**
 * Hook for subscribing to real-time task updates
 */
export function useTaskSubscription({
	taskId,
	onMessage,
	onStatusUpdate,
}: UseTaskSubscriptionProps): UseTaskSubscriptionReturn {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [connection, setConnection] = useState<WebSocket | null>(null);

	const disconnect = useCallback(() => {
		if (connection) {
			connection.close();
			setConnection(null);
			setIsConnected(false);
		}
	}, [connection]);

	const reconnect = useCallback(async () => {
		disconnect();

		const setters = {
			setConnection,
			setError,
			setIsConnected,
		};

		const callbacks = {
			onMessage,
			onStatusUpdate,
		};

		await establishConnection(taskId, setters, callbacks);
	}, [taskId, onMessage, onStatusUpdate, disconnect]);

	useEffect(() => {
		if (taskId) {
			reconnect();
		}

		return () => {
			disconnect();
		};
	}, [taskId, reconnect, disconnect]);

	return {
		isConnected,
		error,
		disconnect,
		reconnect,
	};
}
