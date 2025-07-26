// WebSocket service for real-time updates

import type { PRData } from "@/components/features/pr-integration/pr-status-card";
import type { EnhancedTask } from "./tasks";

export interface WebSocketMessage {
	type: string;
	payload: any;
	timestamp: Date;
	id: string;
}

export interface TaskUpdateMessage extends WebSocketMessage {
	type: "task:updated" | "task:created" | "task:deleted";
	payload: {
		task: EnhancedTask;
		changes?: Partial<EnhancedTask>;
		userId?: string;
	};
}

export interface PRUpdateMessage extends WebSocketMessage {
	type: "pr:updated" | "pr:created" | "pr:merged" | "pr:closed";
	payload: {
		pr: PRData;
		changes?: Partial<PRData>;
		taskIds?: string[];
	};
}

export interface KanbanUpdateMessage extends WebSocketMessage {
	type: "kanban:task-moved" | "kanban:column-updated";
	payload: {
		taskId: string;
		fromColumn?: string;
		toColumn?: string;
		newIndex?: number;
		boardId: string;
	};
}

export interface ProgressUpdateMessage extends WebSocketMessage {
	type: "progress:updated";
	payload: {
		taskId: string;
		progress: number;
		status: string;
		userId?: string;
	};
}

export type WebSocketEventMessage =
	| TaskUpdateMessage
	| PRUpdateMessage
	| KanbanUpdateMessage
	| ProgressUpdateMessage;

export interface WebSocketConfig {
	url?: string;
	reconnectInterval?: number;
	maxReconnectAttempts?: number;
	heartbeatInterval?: number;
	debug?: boolean;
}

export type WebSocketEventHandler = (message: WebSocketEventMessage) => void;

class WebSocketService {
	private ws: WebSocket | null = null;
	private config: Required<WebSocketConfig>;
	private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
	private reconnectAttempts = 0;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private heartbeatTimer: NodeJS.Timeout | null = null;
	private isConnecting = false;
	private isConnected = false;

	constructor(config: WebSocketConfig = {}) {
		this.config = {
			url: config.url || this.getWebSocketUrl(),
			reconnectInterval: config.reconnectInterval || 3000,
			maxReconnectAttempts: config.maxReconnectAttempts || 10,
			heartbeatInterval: config.heartbeatInterval || 30000,
			debug: config.debug || false,
		};
	}

	private getWebSocketUrl(): string {
		if (typeof window === "undefined") {
			return "ws://localhost:3000/ws";
		}

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const host = window.location.host;
		return `${protocol}//${host}/ws`;
	}

	private log(message: string, ...args: any[]) {
		if (this.config.debug) {
			console.log(`[WebSocket] ${message}`, ...args);
		}
	}

	private error(message: string, ...args: any[]) {
		console.error(`[WebSocket] ${message}`, ...args);
	}

	// Connection management
	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isConnected || this.isConnecting) {
				resolve();
				return;
			}

			this.isConnecting = true;
			this.log("Connecting to WebSocket server...");

			try {
				this.ws = new WebSocket(this.config.url);

				this.ws.onopen = () => {
					this.log("WebSocket connected");
					this.isConnected = true;
					this.isConnecting = false;
					this.reconnectAttempts = 0;
					this.startHeartbeat();
					resolve();
				};

				this.ws.onmessage = (event) => {
					this.handleMessage(event);
				};

				this.ws.onclose = (event) => {
					this.log("WebSocket disconnected", event.code, event.reason);
					this.isConnected = false;
					this.isConnecting = false;
					this.stopHeartbeat();

					if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
						this.scheduleReconnect();
					}
				};

				this.ws.onerror = (error) => {
					this.error("WebSocket error", error);
					this.isConnecting = false;
					reject(error);
				};
			} catch (error) {
				this.error("Failed to create WebSocket connection", error);
				this.isConnecting = false;
				reject(error);
			}
		});
	}

	disconnect(): void {
		this.log("Disconnecting WebSocket...");

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		this.stopHeartbeat();

		if (this.ws) {
			this.ws.close(1000, "Client disconnect");
			this.ws = null;
		}

		this.isConnected = false;
		this.isConnecting = false;
		this.reconnectAttempts = 0;
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectAttempts++;
		const delay = Math.min(
			this.config.reconnectInterval * 2 ** (this.reconnectAttempts - 1),
			30000
		);

		this.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

		this.reconnectTimer = setTimeout(() => {
			this.connect().catch((error) => {
				this.error("Reconnect failed", error);
			});
		}, delay);
	}

	private startHeartbeat(): void {
		this.heartbeatTimer = setInterval(() => {
			if (this.isConnected && this.ws) {
				this.send({
					type: "ping",
					payload: {},
					timestamp: new Date(),
					id: crypto.randomUUID(),
				});
			}
		}, this.config.heartbeatInterval);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	// Message handling
	private handleMessage(event: MessageEvent): void {
		try {
			const message: WebSocketEventMessage = JSON.parse(event.data);
			this.log("Received message", message.type, message.payload);

			// Handle pong responses
			if (message.type === "pong") {
				return;
			}

			// Emit to registered handlers
			const handlers = this.eventHandlers.get(message.type);
			if (handlers) {
				handlers.forEach((handler) => {
					try {
						handler(message);
					} catch (error) {
						this.error("Error in event handler", error);
					}
				});
			}

			// Emit to wildcard handlers
			const wildcardHandlers = this.eventHandlers.get("*");
			if (wildcardHandlers) {
				wildcardHandlers.forEach((handler) => {
					try {
						handler(message);
					} catch (error) {
						this.error("Error in wildcard event handler", error);
					}
				});
			}
		} catch (error) {
			this.error("Failed to parse WebSocket message", error);
		}
	}

	// Event subscription
	on(eventType: string, handler: WebSocketEventHandler): () => void {
		if (!this.eventHandlers.has(eventType)) {
			this.eventHandlers.set(eventType, new Set());
		}

		this.eventHandlers.get(eventType)!.add(handler);

		// Return unsubscribe function
		return () => {
			const handlers = this.eventHandlers.get(eventType);
			if (handlers) {
				handlers.delete(handler);
				if (handlers.size === 0) {
					this.eventHandlers.delete(eventType);
				}
			}
		};
	}

	off(eventType: string, handler?: WebSocketEventHandler): void {
		if (!handler) {
			this.eventHandlers.delete(eventType);
			return;
		}

		const handlers = this.eventHandlers.get(eventType);
		if (handlers) {
			handlers.delete(handler);
			if (handlers.size === 0) {
				this.eventHandlers.delete(eventType);
			}
		}
	}

	// Message sending
	send(message: WebSocketMessage): void {
		if (!this.isConnected || !this.ws) {
			this.error("Cannot send message: WebSocket not connected");
			return;
		}

		try {
			this.ws.send(JSON.stringify(message));
			this.log("Sent message", message.type, message.payload);
		} catch (error) {
			this.error("Failed to send message", error);
		}
	}

	// Convenience methods for specific message types
	subscribeToTask(taskId: string): void {
		this.send({
			type: "subscribe:task",
			payload: { taskId },
			timestamp: new Date(),
			id: crypto.randomUUID(),
		});
	}

	unsubscribeFromTask(taskId: string): void {
		this.send({
			type: "unsubscribe:task",
			payload: { taskId },
			timestamp: new Date(),
			id: crypto.randomUUID(),
		});
	}

	subscribeToKanbanBoard(boardId: string): void {
		this.send({
			type: "subscribe:kanban",
			payload: { boardId },
			timestamp: new Date(),
			id: crypto.randomUUID(),
		});
	}

	unsubscribeFromKanbanBoard(boardId: string): void {
		this.send({
			type: "unsubscribe:kanban",
			payload: { boardId },
			timestamp: new Date(),
			id: crypto.randomUUID(),
		});
	}

	// Status getters
	get connected(): boolean {
		return this.isConnected;
	}

	get connecting(): boolean {
		return this.isConnecting;
	}
}

// Singleton instance
export const websocketService = new WebSocketService();

// React hook for WebSocket integration
export function useWebSocket(config?: WebSocketConfig) {
	if (config) {
		return new WebSocketService(config);
	}
	return websocketService;
}
