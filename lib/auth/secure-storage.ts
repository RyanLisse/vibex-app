import { defaults, seal, unseal } from "@hapi/iron";
import { db } from "@/lib/db";

const SECRET = process.env.ENCRYPTION_SECRET!;

if (!SECRET) {
	throw new Error("ENCRYPTION_SECRET environment variable is required");
}

export interface AuthTokens {
	accessToken: string;
	refreshToken?: string;
	expiresAt: Date;
	provider: string;
}

export class SecureTokenStorage {
	async store(userId: string, tokens: AuthTokens): Promise<void> {
		// Encrypt tokens
		const sealed = await seal(tokens, SECRET, {
			...defaults,
			ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
		});

		// Store in secure database, not filesystem
		await db.authTokens.upsert({
			where: { userId },
			update: {
				encryptedTokens: sealed,
				updatedAt: new Date(),
			},
			create: {
				userId,
				encryptedTokens: sealed,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});
	}

	async retrieve(userId: string): Promise<AuthTokens | null> {
		const record = await db.authTokens.findUnique({ where: { userId } });
		if (!record) return null;

		try {
			const unsealed = await unseal(record.encryptedTokens, SECRET, defaults);

			// Validate token structure
			if (!this.isValidTokenStructure(unsealed)) {
				await this.revoke(userId);
				return null;
			}

			return unsealed as AuthTokens;
		} catch {
			// Token expired or tampered
			await this.revoke(userId);
			return null;
		}
	}

	async revoke(userId: string): Promise<void> {
		await db.authTokens.delete({ where: { userId } });
	}

	async revokeAll(): Promise<void> {
		await db.authTokens.deleteMany({});
	}

	private isValidTokenStructure(data: unknown): data is AuthTokens {
		if (!data || typeof data !== "object") return false;
		const tokens = data as any;

		return (
			typeof tokens.accessToken === "string" &&
			typeof tokens.provider === "string" &&
			tokens.expiresAt instanceof Date
		);
	}
}

export const secureTokenStorage = new SecureTokenStorage();
