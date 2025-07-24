/**
 * ElectricSQL Authentication Service
 * Handles authentication tokens and permissions for ElectricSQL integration
 */

import { ObservabilityService } from "../observability";

export interface ElectricAuthConfig {
	userId?: string;
	apiKey?: string;
	customToken?: string;
	endpoint?: string;
	refreshToken?: string;
	expiresAt?: number;
}

export interface TokenInfo {
	hasToken: boolean;
	isExpired: boolean;
	expiresAt: Date | null;
	timeUntilExpiry: number | null;
}

/**
 * ElectricSQL Authentication Service
 * Manages authentication tokens and user permissions for ElectricSQL
 */
export class ElectricAuthService {
	private static instance: ElectricAuthService | null = null;
	private observability = ObservabilityService.getInstance();
	private authToken: string | null = null;
	private refreshToken: string | null = null;
	private expiresAt: Date | null = null;
	private userId: string | null = null;
	private permissions: Set<string> = new Set();
	private isInitialized = false;

	private constructor() {
		// Private constructor for singleton pattern
	}

	static getInstance(): ElectricAuthService {
		if (!ElectricAuthService.instance) {
			ElectricAuthService.instance = new ElectricAuthService();
		}
		return ElectricAuthService.instance;
	}

	/**
	 * Initialize the authentication service
	 */
	async initialize(config: ElectricAuthConfig = {}): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		return this.observability.trackOperation("electric.auth.initialize", async () => {
			try {
				// Load existing token from storage
				await this.loadStoredAuth();

				// Use provided config if no stored auth
				if (!this.authToken && (config.apiKey || config.customToken)) {
					await this.setAuthToken(
						config.apiKey || config.customToken!,
						config.expiresAt ? new Date(config.expiresAt) : null,
						config.refreshToken
					);
				}

				// Set user ID
				if (config.userId) {
					this.userId = config.userId;
				}

				// Set default permissions
				this.setDefaultPermissions();

				this.isInitialized = true;
				console.log("ElectricSQL auth service initialized");
			} catch (error) {
				console.error("Failed to initialize ElectricSQL auth service:", error);
				this.observability.recordError("electric.auth.initialize", error as Error);
				throw error;
			}
		});
	}

	/**
	 * Set authentication token
	 */
	async setAuthToken(
		token: string,
		expiresAt: Date | null = null,
		refreshToken?: string
	): Promise<void> {
		return this.observability.trackOperation("electric.auth.set-token", async () => {
			this.authToken = token;
			this.expiresAt = expiresAt;
			this.refreshToken = refreshToken || null;

			// Store in secure storage
			await this.storeAuth();

			console.log("ElectricSQL auth token set");
		});
	}

	/**
	 * Get current authentication token
	 */
	getAuthToken(): string | null {
		if (this.isTokenExpired()) {
			return null;
		}
		return this.authToken;
	}

	/**
	 * Get token information
	 */
	getTokenInfo(): TokenInfo {
		const hasToken = !!this.authToken;
		const isExpired = this.isTokenExpired();
		const timeUntilExpiry = this.expiresAt
			? Math.max(0, this.expiresAt.getTime() - Date.now())
			: null;

		return {
			hasToken,
			isExpired,
			expiresAt: this.expiresAt,
			timeUntilExpiry,
		};
	}

	/**
	 * Check if token is expired
	 */
	isTokenExpired(): boolean {
		if (!this.expiresAt) {
			return false; // No expiration set
		}
		return Date.now() >= this.expiresAt.getTime();
	}

	/**
	 * Refresh authentication token
	 */
	async refreshAuthToken(): Promise<void> {
		if (!this.refreshToken) {
			throw new Error("No refresh token available");
		}

		return this.observability.trackOperation("electric.auth.refresh", async () => {
			try {
				// This would integrate with your actual auth service
				// For now, we'll simulate token refresh
				const newToken = await this.performTokenRefresh(this.refreshToken!);

				await this.setAuthToken(
					newToken.accessToken,
					new Date(Date.now() + newToken.expiresIn * 1000),
					newToken.refreshToken
				);

				console.log("ElectricSQL auth token refreshed");
			} catch (error) {
				console.error("Failed to refresh auth token:", error);
				this.observability.recordError("electric.auth.refresh", error as Error);
				throw error;
			}
		});
	}

	/**
	 * Perform token refresh (integrate with your auth service)
	 */
	private async performTokenRefresh(refreshToken: string): Promise<{
		accessToken: string;
		refreshToken: string;
		expiresIn: number;
	}> {
		// This is a placeholder - integrate with your actual auth service
		// For example, if using GitHub OAuth:
		/*
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				client_id: process.env.GITHUB_CLIENT_ID,
				client_secret: process.env.GITHUB_CLIENT_SECRET,
				refresh_token: refreshToken,
				grant_type: 'refresh_token',
			}),
		});
		
		const data = await response.json();
		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token || refreshToken,
			expiresIn: data.expires_in || 3600,
		};
		*/

		// Placeholder implementation
		return {
			accessToken: `refreshed_${Date.now()}`,
			refreshToken: refreshToken,
			expiresIn: 3600,
		};
	}

	/**
	 * Check if user has specific permission
	 */
	hasPermission(operation: "read" | "write" | "delete" | "admin"): boolean {
		return this.permissions.has(operation);
	}

	/**
	 * Set user permissions
	 */
	setPermissions(permissions: string[]): void {
		this.permissions = new Set(permissions);
		console.log("ElectricSQL permissions updated:", permissions);
	}

	/**
	 * Add permission
	 */
	addPermission(permission: string): void {
		this.permissions.add(permission);
	}

	/**
	 * Remove permission
	 */
	removePermission(permission: string): void {
		this.permissions.delete(permission);
	}

	/**
	 * Get authorization headers for API requests
	 */
	getAuthHeaders(): Record<string, string> {
		const token = this.getAuthToken();
		if (!token) {
			return {};
		}

		return {
			Authorization: `Bearer ${token}`,
			"X-User-ID": this.userId || "",
		};
	}

	/**
	 * Get current user ID
	 */
	getUserId(): string | null {
		return this.userId;
	}

	/**
	 * Set user ID
	 */
	setUserId(userId: string): void {
		this.userId = userId;
	}

	/**
	 * Logout and clear authentication
	 */
	async logout(): Promise<void> {
		return this.observability.trackOperation("electric.auth.logout", async () => {
			this.authToken = null;
			this.refreshToken = null;
			this.expiresAt = null;
			this.userId = null;
			this.permissions.clear();

			// Clear stored auth
			await this.clearStoredAuth();

			console.log("ElectricSQL auth cleared");
		});
	}

	/**
	 * Set default permissions based on user role
	 */
	private setDefaultPermissions(): void {
		// Default permissions for authenticated users
		this.permissions.add("read");
		this.permissions.add("write");

		// Add admin permissions if user is admin (you can customize this logic)
		if (this.userId && this.isAdminUser(this.userId)) {
			this.permissions.add("delete");
			this.permissions.add("admin");
		}
	}

	/**
	 * Check if user is admin (customize this logic)
	 */
	private isAdminUser(userId: string): boolean {
		// Implement your admin user detection logic
		// For example, check against a list of admin user IDs
		const adminUsers = process.env.ADMIN_USER_IDS?.split(",") || [];
		return adminUsers.includes(userId);
	}

	/**
	 * Store authentication in secure storage
	 */
	private async storeAuth(): Promise<void> {
		if (typeof window === "undefined") {
			return; // Server-side, no storage
		}

		try {
			const authData = {
				token: this.authToken,
				refreshToken: this.refreshToken,
				expiresAt: this.expiresAt?.toISOString(),
				userId: this.userId,
				permissions: Array.from(this.permissions),
			};

			// Use sessionStorage for security (cleared when tab closes)
			sessionStorage.setItem("electric-auth", JSON.stringify(authData));
		} catch (error) {
			console.error("Failed to store auth data:", error);
		}
	}

	/**
	 * Load authentication from storage
	 */
	private async loadStoredAuth(): Promise<void> {
		if (typeof window === "undefined") {
			return; // Server-side, no storage
		}

		try {
			const stored = sessionStorage.getItem("electric-auth");
			if (!stored) {
				return;
			}

			const authData = JSON.parse(stored);
			this.authToken = authData.token;
			this.refreshToken = authData.refreshToken;
			this.expiresAt = authData.expiresAt ? new Date(authData.expiresAt) : null;
			this.userId = authData.userId;
			this.permissions = new Set(authData.permissions || []);

			// Check if token is expired and try to refresh
			if (this.isTokenExpired() && this.refreshToken) {
				try {
					await this.refreshAuthToken();
				} catch (error) {
					console.warn("Failed to refresh expired token:", error);
					await this.logout();
				}
			}
		} catch (error) {
			console.error("Failed to load stored auth:", error);
			await this.clearStoredAuth();
		}
	}

	/**
	 * Clear stored authentication
	 */
	private async clearStoredAuth(): Promise<void> {
		if (typeof window === "undefined") {
			return; // Server-side, no storage
		}

		try {
			sessionStorage.removeItem("electric-auth");
		} catch (error) {
			console.error("Failed to clear stored auth:", error);
		}
	}

	/**
	 * Cleanup method
	 */
	async cleanup(): Promise<void> {
		try {
			await this.logout();
			this.isInitialized = false;
			console.log("ElectricSQL auth service cleaned up");
		} catch (error) {
			console.error("Error during auth service cleanup:", error);
			this.observability.recordError("electric.auth.cleanup", error as Error);
		}
	}
}

// Export singleton instance
export const electricAuthService = ElectricAuthService.getInstance();
