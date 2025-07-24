/**
 * Shared Authentication Provider Configurations
 * Centralizes provider-specific settings and reduces duplication
 */

import type { OAuthConfig } from "./oauth-utils";

export interface AuthProviderConfig extends OAuthConfig {
	/** Environment variable prefix (e.g., 'ANTHROPIC', 'OPENAI') */
	envPrefix: string;
	/** Default token URL if not provided in environment */
	defaultTokenUrl?: string;
	/** Default authorization URL if not provided in environment */
	defaultAuthUrl?: string;
	/** Cookie name for storing tokens */
	cookieName: string;
	/** Cookies to clear on logout */
	cookiesToClear: string[];
	/** Provider display name */
	displayName: string;
}

/**
 * Load environment variables for a provider
 */
function loadProviderEnv(prefix: string) {
	return {
		clientId: process.env[`${prefix}_CLIENT_ID`] || "test-client-id",
		clientSecret: process.env[`${prefix}_CLIENT_SECRET`] || "test-client-secret",
		redirectUri:
			process.env[`${prefix}_REDIRECT_URI`] ||
			`http://localhost:3000/api/auth/${prefix.toLowerCase()}/callback`,
		tokenUrl: process.env[`${prefix}_TOKEN_URL`],
		authUrl: process.env[`${prefix}_AUTH_URL`],
		baseUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
	};
}

/**
 * Create a standardized provider configuration
 */
export function createProviderConfig(
	providerName: string,
	envPrefix: string,
	defaults: {
		tokenUrl?: string;
		authUrl?: string;
		cookieName: string;
		additionalCookies?: string[];
		displayName: string;
	}
): AuthProviderConfig {
	const env = loadProviderEnv(envPrefix);

	return {
		clientId: env.clientId,
		clientSecret: env.clientSecret,
		redirectUri: env.redirectUri,
		tokenUrl: env.tokenUrl || defaults.tokenUrl,
		providerName,
		envPrefix,
		defaultTokenUrl: defaults.tokenUrl,
		defaultAuthUrl: defaults.authUrl,
		cookieName: defaults.cookieName,
		cookiesToClear: [
			defaults.cookieName,
			`${defaults.cookieName}-state`,
			`${defaults.cookieName}-redirect-uri`,
			`${defaults.cookieName}-refresh-token`,
			...(defaults.additionalCookies || []),
		],
		displayName: defaults.displayName,
	};
}

/**
 * Anthropic OAuth configuration
 */
export const anthropicConfig = createProviderConfig("Anthropic", "ANTHROPIC", {
	tokenUrl: "https://api.anthropic.com/oauth/token",
	authUrl: "https://console.anthropic.com/oauth/authorize",
	cookieName: "anthropic-token",
	displayName: "Claude",
	additionalCookies: ["anthropic-oauth-state"],
});

/**
 * OpenAI OAuth configuration
 */
export const openaiConfig = createProviderConfig("OpenAI", "OPENAI", {
	tokenUrl: "https://api.openai.com/oauth/token",
	authUrl: "https://platform.openai.com/oauth/authorize",
	cookieName: "openai-token",
	displayName: "ChatGPT",
	additionalCookies: ["openai-oauth-state"],
});

/**
 * GitHub OAuth configuration (if needed)
 */
export const githubConfig = createProviderConfig("GitHub", "GITHUB", {
	tokenUrl: "https://github.com/login/oauth/access_token",
	authUrl: "https://github.com/login/oauth/authorize",
	cookieName: "github-token",
	displayName: "GitHub",
});

/**
 * Get provider configuration by name
 */
export function getProviderConfig(providerName: string): AuthProviderConfig | null {
	const configs = {
		anthropic: anthropicConfig,
		openai: openaiConfig,
		github: githubConfig,
	};

	return configs[providerName.toLowerCase() as keyof typeof configs] || null;
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config: AuthProviderConfig): string[] {
	const errors: string[] = [];

	if (!config.clientId || config.clientId === "test-client-id") {
		errors.push(`Missing ${config.envPrefix}_CLIENT_ID environment variable`);
	}

	if (!config.clientSecret || config.clientSecret === "test-client-secret") {
		errors.push(`Missing ${config.envPrefix}_CLIENT_SECRET environment variable`);
	}

	if (!config.tokenUrl) {
		errors.push(`Missing token URL for ${config.providerName}`);
	}

	return errors;
}

/**
 * Get provider configuration with validation
 */
export function getValidatedProviderConfig(providerName: string): {
	config: AuthProviderConfig | null;
	errors: string[];
} {
	const config = getProviderConfig(providerName);

	if (!config) {
		return {
			config: null,
			errors: [`Unknown provider: ${providerName}`],
		};
	}

	const errors = validateProviderConfig(config);

	return { config, errors };
}
