/**
 * SessionService - Redis/Valkey Session Management Implementation
 *
 * Provides secure session management with multi-device support and analytics
 */

import { RedisClientManager } from "./redis-client";
import type { SessionData, SessionOptions } from "./types";

export class SessionService {
	private static instance: SessionService | null = null;
	private redisManager: RedisClientManager;

	private constructor() {
		this.redisManager = RedisClientManager.getInstance();
	}

	static getInstance(): SessionService {
		if (!SessionService.instance) {
			SessionService.instance = new SessionService();
		}
		return SessionService.instance;
	}

	async createSession(
		sessionId: string,
		data: SessionData,
		options?: SessionOptions,
	): Promise<string> {
		const client = this.redisManager.getClient();
		const ttl = options?.ttl || 3600; // Default 1 hour
		await client.setex(`session:${sessionId}`, ttl, JSON.stringify(data));
		return sessionId;
	}

	async getSession(sessionId: string): Promise<SessionData | null> {
		const client = this.redisManager.getClient();
		const data = await client.get(`session:${sessionId}`);
		return data ? JSON.parse(data) : null;
	}

	async deleteSession(sessionId: string): Promise<boolean> {
		const client = this.redisManager.getClient();
		const result = await client.del(`session:${sessionId}`);
		return result > 0;
	}

	async extendSession(sessionId: string, ttl: number): Promise<boolean> {
		const client = this.redisManager.getClient();
		const result = await client.expire(`session:${sessionId}`, ttl);
		return result === 1;
	}

	async cleanup(): Promise<void> {
		// Implementation for cleanup
	}
}
