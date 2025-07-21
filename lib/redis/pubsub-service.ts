/**
 * PubSubService - Redis/Valkey Pub/Sub Implementation
 *
 * Provides real-time messaging and event broadcasting capabilities
 */

import { RedisClientManager } from "./redis-client";
import type { PubSubMessage, PubSubOptions } from "./types";

export class PubSubService {
	private static instance: PubSubService | null = null;
	private redisManager: RedisClientManager;
	private subscribers: Map<string, Set<(message: PubSubMessage) => void>> =
		new Map();

	private constructor() {
		this.redisManager = RedisClientManager.getInstance();
	}

	static getInstance(): PubSubService {
		if (!PubSubService.instance) {
			PubSubService.instance = new PubSubService();
		}
		return PubSubService.instance;
	}

	async publish(
		channel: string,
		message: any,
		options?: PubSubOptions,
	): Promise<number> {
		const client = this.redisManager.getClient();
		const data: PubSubMessage = {
			id: Date.now().toString(),
			channel,
			data: message,
			timestamp: new Date(),
			metadata: options?.metadata,
		};
		return await client.publish(channel, JSON.stringify(data));
	}

	async subscribe(
		channel: string,
		callback: (message: PubSubMessage) => void,
	): Promise<void> {
		if (!this.subscribers.has(channel)) {
			this.subscribers.set(channel, new Set());
		}
		this.subscribers.get(channel)!.add(callback);
	}

	async unsubscribe(
		channel: string,
		callback?: (message: PubSubMessage) => void,
	): Promise<void> {
		const channelSubscribers = this.subscribers.get(channel);
		if (channelSubscribers) {
			if (callback) {
				channelSubscribers.delete(callback);
			} else {
				channelSubscribers.clear();
			}
		}
	}

	async cleanup(): Promise<void> {
		this.subscribers.clear();
	}
}
