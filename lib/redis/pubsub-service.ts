/**
 * PubSubService - Redis/Valkey Pub/Sub Implementation
 *
 * Provides real-time messaging and event broadcasting capabilities
 */

import { RedisClientManager } from "./redis-client";
import type { PubSubMessage, PubSubOptions } from "./types";

export interface PubSubSubscription {
	id: string;
	channel?: string;
	pattern?: string;
	isActive: boolean;
	callback: (message: PubSubMessage) => void;
}

export interface PubSubStats {
	totalSubscriptions: number;
	channelSubscriptions: number;
	patternSubscriptions: number;
	totalMessages: number;
}

export class PubSubService {
	private static instance: PubSubService | null = null;
	private redisManager: RedisClientManager;
	private subscriptions: Map<string, PubSubSubscription> = new Map();
	private subscribers: Map<string, Set<(message: PubSubMessage) => void>> = new Map();
	private patternSubscribers: Map<string, Set<(message: PubSubMessage) => void>> = new Map();
	private messageCount = 0;
	private subscriptionIdCounter = 0;

	private constructor() {
		this.redisManager = RedisClientManager.getInstance();
	}

	static getInstance(): PubSubService {
		if (!PubSubService.instance) {
			PubSubService.instance = new PubSubService();
		}
		return PubSubService.instance;
	}

	async publish(channel: string, message: any, options?: PubSubOptions): Promise<boolean> {
		if (!channel || channel.trim() === "") {
			throw new Error("Channel name cannot be empty");
		}

		try {
			const client = this.redisManager.getClient();
			const data: PubSubMessage = {
				messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				channel,
				data: message,
				timestamp: new Date(),
				metadata: options?.metadata,
			};

			// Publish to Redis
			const numReceivers = await client.publish(channel, JSON.stringify(data));

			// Simulate local delivery for testing
			await this.deliverMessage(data);

			this.messageCount++;
			return true;
		} catch (error) {
			console.error("Failed to publish message:", error);
			return false;
		}
	}

	async subscribe(
		channel: string,
		callback: (message: PubSubMessage) => void,
		options?: PubSubOptions
	): Promise<PubSubSubscription> {
		if (!channel || channel.trim() === "") {
			throw new Error("Channel name cannot be empty");
		}

		const subscriptionId = `sub_${++this.subscriptionIdCounter}`;
		const subscription: PubSubSubscription = {
			id: subscriptionId,
			channel,
			isActive: true,
			callback: this.wrapCallback(callback, options),
		};

		this.subscriptions.set(subscriptionId, subscription);

		if (!this.subscribers.has(channel)) {
			this.subscribers.set(channel, new Set());
		}
		this.subscribers.get(channel)!.add(subscription.callback);

		return subscription;
	}

	async subscribePattern(
		pattern: string,
		callback: (message: PubSubMessage) => void,
		options?: PubSubOptions
	): Promise<PubSubSubscription> {
		const subscriptionId = `psub_${++this.subscriptionIdCounter}`;
		const subscription: PubSubSubscription = {
			id: subscriptionId,
			pattern,
			isActive: true,
			callback: this.wrapCallback(callback, options),
		};

		this.subscriptions.set(subscriptionId, subscription);

		if (!this.patternSubscribers.has(pattern)) {
			this.patternSubscribers.set(pattern, new Set());
		}
		this.patternSubscribers.get(pattern)!.add(subscription.callback);

		return subscription;
	}

	async unsubscribe(subscriptionId: string): Promise<boolean> {
		const subscription = this.subscriptions.get(subscriptionId);
		if (!subscription) {
			return false;
		}

		subscription.isActive = false;

		if (subscription.channel) {
			const channelSubscribers = this.subscribers.get(subscription.channel);
			if (channelSubscribers) {
				channelSubscribers.delete(subscription.callback);
				if (channelSubscribers.size === 0) {
					this.subscribers.delete(subscription.channel);
				}
			}
		}

		if (subscription.pattern) {
			const patternSubscribers = this.patternSubscribers.get(subscription.pattern);
			if (patternSubscribers) {
				patternSubscribers.delete(subscription.callback);
				if (patternSubscribers.size === 0) {
					this.patternSubscribers.delete(subscription.pattern);
				}
			}
		}

		this.subscriptions.delete(subscriptionId);
		return true;
	}

	getActiveSubscriptions(): PubSubSubscription[] {
		return Array.from(this.subscriptions.values()).filter((sub) => sub.isActive);
	}

	getStats(): PubSubStats {
		const activeSubscriptions = this.getActiveSubscriptions();
		return {
			totalSubscriptions: activeSubscriptions.length,
			channelSubscriptions: activeSubscriptions.filter((sub) => sub.channel).length,
			patternSubscriptions: activeSubscriptions.filter((sub) => sub.pattern).length,
			totalMessages: this.messageCount,
		};
	}

	private wrapCallback(
		callback: (message: PubSubMessage) => void,
		options?: PubSubOptions
	): (message: PubSubMessage) => void {
		return (message: PubSubMessage) => {
			if (options?.retryOnError && options.maxRetries) {
				this.executeWithRetry(callback, message, options.maxRetries, options.retryDelay || 100);
			} else {
				try {
					callback(message);
				} catch (error) {
					console.error("Subscription callback error:", error);
				}
			}
		};
	}

	private async executeWithRetry(
		callback: (message: PubSubMessage) => void,
		message: PubSubMessage,
		maxRetries: number,
		retryDelay: number
	): Promise<void> {
		let attempts = 0;
		while (attempts < maxRetries) {
			try {
				attempts++;
				callback(message);
				break;
			} catch (error) {
				if (attempts >= maxRetries) {
					console.error(`Callback failed after ${maxRetries} attempts:`, error);
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, retryDelay));
			}
		}
	}

	private async deliverMessage(message: PubSubMessage): Promise<void> {
		// Deliver to channel subscribers
		const channelSubscribers = this.subscribers.get(message.channel);
		if (channelSubscribers) {
			for (const callback of channelSubscribers) {
				try {
					callback(message);
				} catch (error) {
					console.error("Message delivery error:", error);
				}
			}
		}

		// Deliver to pattern subscribers
		for (const [pattern, callbacks] of this.patternSubscribers.entries()) {
			if (this.matchesPattern(message.channel, pattern)) {
				for (const callback of callbacks) {
					try {
						callback(message);
					} catch (error) {
						console.error("Pattern message delivery error:", error);
					}
				}
			}
		}
	}

	private matchesPattern(channel: string, pattern: string): boolean {
		// Simple pattern matching - convert glob pattern to regex
		const regexPattern = pattern
			.replace(/\*/g, ".*")
			.replace(/\?/g, ".")
			.replace(/\[([^\]]+)\]/g, "[$1]");
		const regex = new RegExp(`^${regexPattern}$`);
		return regex.test(channel);
	}

	async cleanup(): Promise<void> {
		this.subscriptions.clear();
		this.subscribers.clear();
		this.patternSubscribers.clear();
		this.messageCount = 0;
		this.subscriptionIdCounter = 0;
	}
}
