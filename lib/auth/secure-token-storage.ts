/**
 * Secure Token Storage
 *
 * Provides encrypted token storage in the database instead of file system
 * Implements proper encryption at rest and secure session management
 */

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/config";
import { authTokens } from "@/db/schema";
import { observabilityService } from "@/lib/observability";

// Token schemas
const OauthTokenSchema = z.object({
	type: z.literal("oauth"),
	refresh: z.string(),
	access: z.string(),
	expires: z.number(),
});

const ApiTokenSchema = z.object({
	type: z.literal("api"),
	key: z.string(),
});

export type AuthToken = z.infer<typeof OauthTokenSchema> | z.infer<typeof ApiTokenSchema>;

const TokenSchema = z.discriminatedUnion("type", [OauthTokenSchema, ApiTokenSchema]);

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

export class SecureTokenStorage {
	private encryptionKey: Buffer;

	constructor() {
		const key = process.env.ENCRYPTION_SECRET;
		if (!key || key.length < 32) {
			throw new Error("ENCRYPTION_SECRET must be set and at least 32 characters long");
		}
		// Derive a consistent key from the secret
		this.encryptionKey = crypto.scryptSync(key, "salt", 32);
	}

	/**
	 * Encrypt sensitive data using AES-256-GCM
	 */
	private encrypt(data: string): string {
		const iv = crypto.randomBytes(IV_LENGTH);
		const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

		const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);

		const tag = cipher.getAuthTag();

		// Combine iv + tag + encrypted data
		const combined = Buffer.concat([iv, tag, encrypted]);
		return combined.toString("base64");
	}

	/**
	 * Decrypt data encrypted with encrypt()
	 */
	private decrypt(encryptedData: string): string {
		const combined = Buffer.from(encryptedData, "base64");

		// Extract components
		const iv = combined.subarray(0, IV_LENGTH);
		const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
		const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

		const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
		decipher.setAuthTag(tag);

		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

		return decrypted.toString("utf8");
	}

	/**
	 * Store encrypted token in database
	 */
	async store(userId: string, providerId: string, token: AuthToken): Promise<void> {
		try {
			const serialized = JSON.stringify(token);
			const encrypted = this.encrypt(serialized);

			// Use upsert to handle both insert and update
			await db
				.insert(authTokens)
				.values({
					userId,
					providerId,
					encryptedToken: encrypted,
					tokenType: token.type,
					expiresAt: token.type === "oauth" ? new Date(token.expires) : null,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: [authTokens.userId, authTokens.providerId],
					set: {
						encryptedToken: encrypted,
						tokenType: token.type,
						expiresAt: token.type === "oauth" ? new Date(token.expires) : null,
						updatedAt: new Date(),
					},
				});

			observabilityService.recordEvent({
				type: "security",
				category: "auth",
				message: "Token stored securely",
				metadata: { userId, providerId, tokenType: token.type },
			});
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "secure_token_storage",
				operation: "store",
				userId,
				providerId,
			});
			throw new Error("Failed to store token securely");
		}
	}

	/**
	 * Retrieve and decrypt token from database
	 */
	async retrieve(userId: string, providerId: string): Promise<AuthToken | null> {
		try {
			const [record] = await db
				.select()
				.from(authTokens)
				.where(and(eq(authTokens.userId, userId), eq(authTokens.providerId, providerId)))
				.limit(1);

			if (!record) {
				return null;
			}

			// Check if token is expired
			if (record.expiresAt && record.expiresAt < new Date()) {
				await this.revoke(userId, providerId);
				return null;
			}

			const decrypted = this.decrypt(record.encryptedToken);
			const parsed = JSON.parse(decrypted);

			const validated = TokenSchema.safeParse(parsed);
			if (!validated.success) {
				observabilityService.recordError(new Error("Invalid token format"), {
					context: "secure_token_storage",
					operation: "retrieve",
					userId,
					providerId,
				});
				return null;
			}

			return validated.data;
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "secure_token_storage",
				operation: "retrieve",
				userId,
				providerId,
			});
			return null;
		}
	}

	/**
	 * Retrieve all tokens for a user
	 */
	async retrieveAll(userId: string): Promise<Record<string, AuthToken>> {
		try {
			const records = await db.select().from(authTokens).where(eq(authTokens.userId, userId));

			const tokens: Record<string, AuthToken> = {};

			for (const record of records) {
				// Skip expired tokens
				if (record.expiresAt && record.expiresAt < new Date()) {
					continue;
				}

				try {
					const decrypted = this.decrypt(record.encryptedToken);
					const parsed = JSON.parse(decrypted);
					const validated = TokenSchema.safeParse(parsed);

					if (validated.success) {
						tokens[record.providerId] = validated.data;
					}
				} catch {}
			}

			return tokens;
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "secure_token_storage",
				operation: "retrieveAll",
				userId,
			});
			return {};
		}
	}

	/**
	 * Revoke (delete) a token
	 */
	async revoke(userId: string, providerId: string): Promise<void> {
		try {
			await db
				.delete(authTokens)
				.where(and(eq(authTokens.userId, userId), eq(authTokens.providerId, providerId)));

			observabilityService.recordEvent({
				type: "security",
				category: "auth",
				message: "Token revoked",
				metadata: { userId, providerId },
			});
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "secure_token_storage",
				operation: "revoke",
				userId,
				providerId,
			});
			throw new Error("Failed to revoke token");
		}
	}

	/**
	 * Revoke all tokens for a user
	 */
	async revokeAll(userId: string): Promise<void> {
		try {
			await db.delete(authTokens).where(eq(authTokens.userId, userId));

			observabilityService.recordEvent({
				type: "security",
				category: "auth",
				message: "All tokens revoked for user",
				metadata: { userId },
			});
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "secure_token_storage",
				operation: "revokeAll",
				userId,
			});
			throw new Error("Failed to revoke all tokens");
		}
	}

	/**
	 * Clean up expired tokens (should be run periodically)
	 */
	async cleanupExpired(): Promise<number> {
		try {
			const result = await db
				.delete(authTokens)
				.where(and(authTokens.expiresAt !== null, authTokens.expiresAt < new Date()));

			const count = result.rowCount || 0;

			observabilityService.recordEvent({
				type: "security",
				category: "auth",
				message: "Expired tokens cleaned up",
				metadata: { count },
			});

			return count;
		} catch (error) {
			observabilityService.recordError(error as Error, {
				context: "secure_token_storage",
				operation: "cleanupExpired",
			});
			return 0;
		}
	}
}

// Export singleton instance
export const secureTokenStorage = new SecureTokenStorage();
