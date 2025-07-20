/**
 * ElectricSQL Real-time WebSocket Sync Service
 *
 * Handles WebSocket connections for real-time data synchronization,
 * conflict resolution, and offline queue management.
 */

import { ObservabilityService } from "@/lib/observability";
import type { SyncEvent } from "./config";
import { conflictResolutionService } from "./conflict-resolution";
import { electricDatabaseClient } from "./database-client";

interface WebSocketMessage {
	type: "sync" | "conflict" | "heartbeat" | "auth" | "error";
	table?: string;
	operation?: "insert" | "update" | "delete";
	data?: any;
	userId?: string;
	timestamp?: string;
	messageId?: string;
	conflictId?: string;
}

interface RealtimeSubscription {
	id: string;
	table: string;
	userId?: string;
	filters?: Record<string, any>;
	callback: (event: SyncEvent) => void;
}

export class RealtimeSyncService {
	private static instance: RealtimeSyncService;
	private observability = ObservabilityService.getInstance();
	private websocket: WebSocket | null = null;
	private isConnected = false;
	private isReconnecting = false;
	private subscriptions = new Map<string, RealtimeSubscription>();
	private messageQueue: WebSocketMessage[] = [];
	private heartbeatInterval: NodeJS.Timeout | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 10;
	private reconnectDelay = 1000;
	private lastPingTime = 0;
	private latency = 0;

	private constructor() {}

	static getInstance(): RealtimeSyncService {
		if (!RealtimeSyncService.instance) {
			RealtimeSyncService.instance = new RealtimeSyncService();
		}
		return RealtimeSyncService.instance;
	}

	/**
	 * Initialize WebSocket connection
	 */
	async initialize(authToken?: string): Promise<void> {
		return this.observability.trackOperation(
			"realtime-sync.initialize",
			async () => {
				const wsUrl = this.buildWebSocketUrl();

				try {
					await this.connect(wsUrl, authToken);
					this.setupHeartbeat();
					console.log("✅ ElectricSQL real-time sync initialized");
				} catch (error) {
					console.error("❌ Failed to initialize real-time sync:", error);
					throw error;
				}
			},
		);
	}

	/**
	 * Build WebSocket URL from configuration
	 */
	private buildWebSocketUrl(): string {
		const baseUrl =
			process.env.ELECTRIC_WEBSOCKET_URL ||
			process.env.ELECTRIC_URL?.replace(/^http/, "ws") ||
			"ws://localhost:5133";

		return `${baseUrl}/ws`;
	}

	/**
	 * Connect to WebSocket server
	 */
	private async connect(url: string, authToken?: string): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				// Add auth token to URL if available
				const wsUrl = authToken ? `${url}?token=${authToken}` : url;

				this.websocket = new (WebSocket as any)(wsUrl) as WebSocket;

				this.websocket.onopen = () => {
					this.isConnected = true;
					this.isReconnecting = false;
					this.reconnectAttempts = 0;

					// Process queued messages
					this.processMessageQueue();

					this.observability.recordEvent("realtime-sync.connected", {
						url,
						reconnectAttempts: this.reconnectAttempts,
					});

					resolve();
				};

				this.websocket.onmessage = (event) => {
					this.handleMessage(event.data);
				};

				this.websocket.onclose = (event) => {
					this.handleDisconnection(event);
				};

				this.websocket.onerror = (error) => {
					this.observability.recordError(
						"realtime-sync.connection",
						new Error(`WebSocket error: ${error}`),
					);
					reject(new Error(`WebSocket connection failed: ${error}`));
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Handle WebSocket messages
	 */
	private handleMessage(data: string): void {
		try {
			const message: WebSocketMessage = JSON.parse(data);

			switch (message.type) {
				case "sync":
					this.handleSyncMessage(message);
					break;
				case "conflict":
					this.handleConflictMessage(message);
					break;
				case "heartbeat":
					this.handleHeartbeat(message);
					break;
				case "error":
					this.handleErrorMessage(message);
					break;
				default:
					console.warn("Unknown message type:", message.type);
			}
		} catch (error) {
			console.error("Failed to parse WebSocket message:", error);
		}
	}

	/**
	 * Handle sync messages from server
	 */
	private async handleSyncMessage(message: WebSocketMessage): Promise<void> {
		if (!(message.table && message.operation)) return;

		const syncEvent: SyncEvent = {
			id: message.messageId || crypto.randomUUID(),
			type: message.operation,
			table: message.table,
			record: message.data,
			timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
			userId: message.userId,
			source: "remote",
		};

		// Update local database
		try {
			switch (message.operation) {
				case "insert":
				case "update":
				case "delete":
					await this.applyRemoteChange(
						message.table,
						message.operation,
						message.data,
					);
					break;
			}
		} catch (error) {
			console.error("Failed to apply remote change:", error);
			// Handle conflict - queue for resolution
			await conflictResolutionService.executeOperationWithConflictResolution({
				table: message.table,
				operation: message.operation,
				data: message.data,
			});
		}

		// Notify subscribers
		this.notifySubscribers(syncEvent);

		this.observability.recordEvent("realtime-sync.message-processed", {
			table: message.table,
			operation: message.operation,
			messageId: message.messageId,
		});
	}

	/**
	 * Handle conflict messages from server
	 */
	private async handleConflictMessage(
		message: WebSocketMessage,
	): Promise<void> {
		console.log("🔥 Conflict detected:", message);

		this.observability.recordEvent("realtime-sync.conflict-detected", {
			table: message.table,
			conflictId: message.conflictId,
		});

		// Let conflict resolution service handle it
		// This would trigger the conflict resolution UI or automatic resolution
	}

	/**
	 * Handle heartbeat messages
	 */
	private handleHeartbeat(message: WebSocketMessage): void {
		if (this.lastPingTime > 0) {
			this.latency = Date.now() - this.lastPingTime;
		}

		// Send pong response
		this.sendMessage({
			type: "heartbeat",
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Handle error messages
	 */
	private handleErrorMessage(message: WebSocketMessage): void {
		console.error("WebSocket error message:", message);
		this.observability.recordError(
			"realtime-sync.server-error",
			new Error(JSON.stringify(message)),
		);
	}

	/**
	 * Apply remote change to local database
	 */
	private async applyRemoteChange(
		table: string,
		operation: string,
		data: any,
	): Promise<void> {
		const dbOperation = {
			table,
			operation: operation as any,
			data,
			options: { realtime: false }, // Don't trigger another sync event
		};

		const result = await electricDatabaseClient.executeOperation(dbOperation);

		if (!result.success) {
			throw new Error(`Failed to apply remote change: ${result.error}`);
		}
	}

	/**
	 * Subscribe to real-time updates for a table
	 */
	subscribeToTable(
		table: string,
		callback: (event: SyncEvent) => void,
		options: {
			userId?: string;
			filters?: Record<string, any>;
		} = {},
	): () => void {
		const subscriptionId = crypto.randomUUID();

		const subscription: RealtimeSubscription = {
			id: subscriptionId,
			table,
			userId: options.userId,
			filters: options.filters,
			callback,
		};

		this.subscriptions.set(subscriptionId, subscription);

		// Send subscription message to server
		this.sendMessage({
			type: "sync",
			table,
			operation: "subscribe" as any,
			data: {
				subscriptionId,
				userId: options.userId,
				filters: options.filters,
			},
		});

		// Return unsubscribe function
		return () => {
			this.subscriptions.delete(subscriptionId);

			// Send unsubscribe message to server
			this.sendMessage({
				type: "sync",
				table,
				operation: "unsubscribe" as any,
				data: { subscriptionId },
			});
		};
	}

	/**
	 * Send real-time update to server
	 */
	async sendUpdate(
		table: string,
		operation: string,
		data: any,
		userId?: string,
	): Promise<void> {
		const message: WebSocketMessage = {
			type: "sync",
			table,
			operation: operation as any,
			data,
			userId,
			timestamp: new Date().toISOString(),
			messageId: crypto.randomUUID(),
		};

		this.sendMessage(message);
	}

	/**
	 * Send message to WebSocket server
	 */
	private sendMessage(message: WebSocketMessage): void {
		if (!(this.isConnected && this.websocket)) {
			// Queue message for later
			this.messageQueue.push(message);
			return;
		}

		try {
			this.websocket.send(JSON.stringify(message));
		} catch (error) {
			console.error("Failed to send WebSocket message:", error);
			this.messageQueue.push(message);
		}
	}

	/**
	 * Process queued messages
	 */
	private processMessageQueue(): void {
		while (this.messageQueue.length > 0 && this.isConnected) {
			const message = this.messageQueue.shift();
			if (message) {
				this.sendMessage(message);
			}
		}
	}

	/**
	 * Notify subscribers of sync events
	 */
	private notifySubscribers(event: SyncEvent): void {
		for (const subscription of this.subscriptions.values()) {
			if (subscription.table !== event.table) continue;

			// Filter by user if specified
			if (subscription.userId && subscription.userId !== event.userId) continue;

			// Apply filters if specified
			if (subscription.filters && event.record) {
				const matchesFilters = Object.entries(subscription.filters).every(
					([key, value]) => event.record[key] === value,
				);
				if (!matchesFilters) continue;
			}

			try {
				subscription.callback(event);
			} catch (error) {
				console.error("Subscription callback error:", error);
			}
		}
	}

	/**
	 * Handle WebSocket disconnection
	 */
	private handleDisconnection(event: CloseEvent): void {
		this.isConnected = false;

		this.observability.recordEvent("realtime-sync.disconnected", {
			code: event.code,
			reason: event.reason,
			wasClean: event.wasClean,
		});

		console.log("WebSocket disconnected:", event.reason);

		// Attempt reconnection if not intentional
		if (!(event.wasClean || this.isReconnecting)) {
			this.attemptReconnection();
		}
	}

	/**
	 * Attempt to reconnect with exponential backoff
	 */
	private async attemptReconnection(): Promise<void> {
		if (
			this.isReconnecting ||
			this.reconnectAttempts >= this.maxReconnectAttempts
		) {
			return;
		}

		this.isReconnecting = true;
		this.reconnectAttempts++;

		const delay = Math.min(
			this.reconnectDelay * 2 ** (this.reconnectAttempts - 1),
			30_000,
		);

		console.log(
			`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
		);

		setTimeout(async () => {
			try {
				const wsUrl = this.buildWebSocketUrl();
				await this.connect(wsUrl);

				// Re-establish subscriptions
				for (const subscription of this.subscriptions.values()) {
					this.sendMessage({
						type: "sync",
						table: subscription.table,
						operation: "subscribe" as any,
						data: {
							subscriptionId: subscription.id,
							userId: subscription.userId,
							filters: subscription.filters,
						},
					});
				}
			} catch (error) {
				console.error("Reconnection attempt failed:", error);
				this.isReconnecting = false;

				// Try again if we haven't exceeded max attempts
				if (this.reconnectAttempts < this.maxReconnectAttempts) {
					this.attemptReconnection();
				}
			}
		}, delay);
	}

	/**
	 * Setup heartbeat to maintain connection
	 */
	private setupHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		this.heartbeatInterval = setInterval(() => {
			if (this.isConnected) {
				this.lastPingTime = Date.now();
				this.sendMessage({
					type: "heartbeat",
					timestamp: new Date().toISOString(),
				});
			}
		}, 30_000); // 30 seconds
	}

	/**
	 * Get connection status
	 */
	getConnectionStatus(): {
		isConnected: boolean;
		isReconnecting: boolean;
		reconnectAttempts: number;
		latency: number;
		subscriptions: number;
		queuedMessages: number;
	} {
		return {
			isConnected: this.isConnected,
			isReconnecting: this.isReconnecting,
			reconnectAttempts: this.reconnectAttempts,
			latency: this.latency,
			subscriptions: this.subscriptions.size,
			queuedMessages: this.messageQueue.length,
		};
	}

	/**
	 * Disconnect WebSocket
	 */
	async disconnect(): Promise<void> {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}

		if (this.websocket) {
			this.websocket.close(1000, "Client disconnect");
			this.websocket = null;
		}

		this.isConnected = false;
		this.subscriptions.clear();
		this.messageQueue.length = 0;

		console.log("ElectricSQL real-time sync disconnected");
	}
}

// Export singleton instance
export const realtimeSyncService = RealtimeSyncService.getInstance();
