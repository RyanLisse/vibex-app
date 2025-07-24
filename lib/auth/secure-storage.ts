/**
 * Secure Storage Service
 *
 * Provides secure storage for sensitive data like API keys, tokens,
 * and user credentials with encryption and proper key management.
 */

import { logger } from "@/lib/logging";
import { observability } from "@/lib/observability";

export interface SecureStorageConfig {
	encryptionKey?: string;
	storagePrefix?: string;
	expirationTime?: number; // in milliseconds
}

export interface StoredItem {
	value: string;
	encrypted: boolean;
	createdAt: number;
	expiresAt?: number;
	metadata?: Record<string, unknown>;
}

export interface SecureStorageOptions {
	encrypt?: boolean;
	expiresIn?: number; // in milliseconds
	metadata?: Record<string, unknown>;
}

export class SecureStorageService {
	private static instance: SecureStorageService | null = null;
	private config: Required<SecureStorageConfig>;
	private logger = logger.child({ component: "SecureStorage" });
	private encryptionKey: string;

	constructor(config: SecureStorageConfig = {}) {
		this.config = {
			encryptionKey: config.encryptionKey || process.env.ENCRYPTION_KEY || this.generateKey(),
			storagePrefix: config.storagePrefix || "secure_",
			expirationTime: config.expirationTime || 24 * 60 * 60 * 1000, // 24 hours
		};
		this.encryptionKey = this.config.encryptionKey;
	}

	static getInstance(config?: SecureStorageConfig): SecureStorageService {
		if (!SecureStorageService.instance) {
			SecureStorageService.instance = new SecureStorageService(config);
		}
		return SecureStorageService.instance;
	}

	/**
	 * Store a value securely
	 */
	async setItem(key: string, value: string, options: SecureStorageOptions = {}): Promise<void> {
		try {
			const now = Date.now();
			const storageKey = this.getStorageKey(key);

			const item: StoredItem = {
				value: options.encrypt !== false ? await this.encrypt(value) : value,
				encrypted: options.encrypt !== false,
				createdAt: now,
				expiresAt: options.expiresIn ? now + options.expiresIn : undefined,
				metadata: options.metadata,
			};

			// Store in localStorage (browser) or memory (server)
			if (typeof window !== "undefined") {
				localStorage.setItem(storageKey, JSON.stringify(item));
			} else {
				// Server-side storage in memory (could be extended to use Redis/database)
				this.serverStorage.set(storageKey, item);
			}

			this.logger.debug("Item stored securely", { key, encrypted: item.encrypted });
			observability.recordEvent("secure_storage.set", { key, encrypted: item.encrypted });
		} catch (error) {
			this.logger.error("Failed to store item securely", { key, error });
			observability.recordError("secure_storage.set_failed", error as Error);
			throw error;
		}
	}

	/**
	 * Retrieve a value securely
	 */
	async getItem(key: string): Promise<string | null> {
		try {
			const storageKey = this.getStorageKey(key);
			let itemData: string | null = null;

			// Retrieve from localStorage (browser) or memory (server)
			if (typeof window !== "undefined") {
				itemData = localStorage.getItem(storageKey);
			} else {
				const item = this.serverStorage.get(storageKey);
				itemData = item ? JSON.stringify(item) : null;
			}

			if (!itemData) {
				return null;
			}

			const item: StoredItem = JSON.parse(itemData);

			// Check expiration
			if (item.expiresAt && Date.now() > item.expiresAt) {
				await this.removeItem(key);
				return null;
			}

			// Decrypt if encrypted
			const value = item.encrypted ? await this.decrypt(item.value) : item.value;

			this.logger.debug("Item retrieved securely", { key, encrypted: item.encrypted });
			return value;
		} catch (error) {
			this.logger.error("Failed to retrieve item securely", { key, error });
			observability.recordError("secure_storage.get_failed", error as Error);
			return null;
		}
	}

	/**
	 * Remove an item
	 */
	async removeItem(key: string): Promise<void> {
		try {
			const storageKey = this.getStorageKey(key);

			if (typeof window !== "undefined") {
				localStorage.removeItem(storageKey);
			} else {
				this.serverStorage.delete(storageKey);
			}

			this.logger.debug("Item removed", { key });
			observability.recordEvent("secure_storage.remove", { key });
		} catch (error) {
			this.logger.error("Failed to remove item", { key, error });
			throw error;
		}
	}

	/**
	 * Check if an item exists and is not expired
	 */
	async hasItem(key: string): Promise<boolean> {
		const value = await this.getItem(key);
		return value !== null;
	}

	/**
	 * Clear all items with the storage prefix
	 */
	async clear(): Promise<void> {
		try {
			if (typeof window !== "undefined") {
				// Browser: iterate through localStorage
				const keysToRemove: string[] = [];
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key?.startsWith(this.config.storagePrefix)) {
						keysToRemove.push(key);
					}
				}
				keysToRemove.forEach((key) => localStorage.removeItem(key));
			} else {
				// Server: clear memory storage
				for (const key of this.serverStorage.keys()) {
					if (key.startsWith(this.config.storagePrefix)) {
						this.serverStorage.delete(key);
					}
				}
			}

			this.logger.info("Secure storage cleared");
			observability.recordEvent("secure_storage.clear", {});
		} catch (error) {
			this.logger.error("Failed to clear secure storage", { error });
			throw error;
		}
	}

	/**
	 * Get all keys (without prefix)
	 */
	async getKeys(): Promise<string[]> {
		const keys: string[] = [];

		try {
			if (typeof window !== "undefined") {
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key?.startsWith(this.config.storagePrefix)) {
						keys.push(key.substring(this.config.storagePrefix.length));
					}
				}
			} else {
				for (const key of this.serverStorage.keys()) {
					if (key.startsWith(this.config.storagePrefix)) {
						keys.push(key.substring(this.config.storagePrefix.length));
					}
				}
			}

			return keys;
		} catch (error) {
			this.logger.error("Failed to get keys", { error });
			return [];
		}
	}

	// Server-side storage (in-memory)
	private serverStorage = new Map<string, StoredItem>();

	/**
	 * Generate storage key with prefix
	 */
	private getStorageKey(key: string): string {
		return `${this.config.storagePrefix}${key}`;
	}

	/**
	 * Simple encryption using base64 and XOR (for demo purposes)
	 * In production, use proper encryption like AES
	 */
	private async encrypt(value: string): Promise<string> {
		try {
			// Simple XOR encryption with the key
			const encrypted = value
				.split("")
				.map((char, i) =>
					String.fromCharCode(
						char.charCodeAt(0) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
					)
				)
				.join("");

			// Base64 encode the result
			return btoa(encrypted);
		} catch (error) {
			this.logger.error("Encryption failed", { error });
			throw new Error("Failed to encrypt value");
		}
	}

	/**
	 * Simple decryption
	 */
	private async decrypt(encryptedValue: string): Promise<string> {
		try {
			// Base64 decode
			const encrypted = atob(encryptedValue);

			// XOR decrypt
			const decrypted = encrypted
				.split("")
				.map((char, i) =>
					String.fromCharCode(
						char.charCodeAt(0) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
					)
				)
				.join("");

			return decrypted;
		} catch (error) {
			this.logger.error("Decryption failed", { error });
			throw new Error("Failed to decrypt value");
		}
	}

	/**
	 * Generate a random encryption key
	 */
	private generateKey(): string {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let result = "";
		for (let i = 0; i < 32; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}
}

// Default instance
export const secureStorage = SecureStorageService.getInstance();

export default SecureStorageService;
