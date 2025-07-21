import fs from "node:fs/promises";
import path from "node:path";
import { TokenValidationConfig } from "../auth";

// Re-export auth utility functions for backwards compatibility
export {
	buildAuthUrl,
	createAuthHeaders,
	exchangeCodeForToken,
	generateCodeChallenge,
	generateCodeVerifier,
	generateState,
	getTokenExpirationTime,
	handleAuthError,
	isTokenExpired,
	isTokenExpiring,
	parseJWT,
	refreshAuthToken,
	revokeToken,
	sanitizeRedirectUrl,
	validateOAuthState,
	validateToken,
} from "../auth";

// Auth info types
export interface OAuthAuthInfo {
	type: "oauth";
	refresh: string;
	access: string;
	expires: number;
}

export interface ApiAuthInfo {
	type: "api";
	key: string;
}

export type AuthInfo = OAuthAuthInfo | ApiAuthInfo;

type AuthData = Record<string, AuthInfo>;

/**
 * Persistent authentication storage class
 */
export class Auth {
	private static readonly DATA_DIR = path.join(process.cwd(), ".auth");
	private static readonly AUTH_FILE = path.join(Auth.DATA_DIR, "auth.json");

	/**
	 * Ensure auth directory exists
	 */
	private static async ensureDirectory(): Promise<void> {
		try {
			await fs.mkdir(Auth.DATA_DIR, { recursive: true });
		} catch {
			// Ignore errors - directory might already exist or we might not have permissions
		}
	}

	/**
	 * Read auth data from file
	 */
	private static async readAuthData(): Promise<AuthData> {
		try {
			await Auth.ensureDirectory();
			const data = await fs.readFile(Auth.AUTH_FILE, "utf-8");
			return JSON.parse(data);
		} catch {
			return {};
		}
	}

	/**
	 * Write auth data to file
	 */
	private static async writeAuthData(data: AuthData): Promise<void> {
		await Auth.ensureDirectory();
		await fs.writeFile(Auth.AUTH_FILE, JSON.stringify(data, null, 2));
		await fs.chmod(Auth.AUTH_FILE, 0o600); // Read/write for owner only
	}

	/**
	 * Validate auth info structure
	 */
	private static isValidAuthInfo(data: unknown): data is AuthInfo {
		if (!data || typeof data !== "object") return false;
		const obj = data as Record<string, unknown>;

		if (obj.type === "oauth") {
			return (
				typeof obj.refresh === "string" &&
				typeof obj.access === "string" &&
				typeof obj.expires === "number"
			);
		}

		if (obj.type === "api") {
			return typeof obj.key === "string";
		}

		return false;
	}

	/**
	 * Get auth info for a provider
	 */
	static async get(provider: string): Promise<AuthInfo | undefined> {
		const data = await Auth.readAuthData();
		const authInfo = data[provider];

		if (!authInfo || !Auth.isValidAuthInfo(authInfo)) {
			return undefined;
		}

		return authInfo;
	}

	/**
	 * Get all auth info
	 */
	static async all(): Promise<AuthData> {
		return Auth.readAuthData();
	}

	/**
	 * Set auth info for a provider
	 */
	static async set(provider: string, authInfo: AuthInfo): Promise<void> {
		const data = await Auth.readAuthData();
		data[provider] = authInfo;
		await Auth.writeAuthData(data);
	}

	/**
	 * Remove auth info for a provider
	 */
	static async remove(provider: string): Promise<void> {
		const data = await Auth.readAuthData();
		delete data[provider];
		await Auth.writeAuthData(data);
	}
}
