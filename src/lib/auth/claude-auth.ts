import {
	generateCodeChallenge,
	generateCodeVerifier,
} from "@/src/lib/auth/pkce";

export interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token?: string;
	scope?: string;
}

export interface AuthConfig {
	clientId: string;
	redirectUri: string;
	scopes?: string[];
	authorizeUrl?: string;
	tokenUrl?: string;
}

export interface AuthData {
	url: string;
	verifier: string;
	state: string;
}

export class ClaudeAuthClient {
	private config: Required<AuthConfig>;

	constructor(config: AuthConfig) {
		this.config = {
			clientId: config.clientId,
			redirectUri: config.redirectUri,
			scopes: config.scopes || [
				"org:create_api_key",
				"user:profile",
				"user:inference",
			],
			authorizeUrl: config.authorizeUrl || "https://claude.ai/oauth/authorize",
			tokenUrl:
				config.tokenUrl || "https://console.anthropic.com/v1/oauth/token",
		};
	}

	/**
	 * Generates the authorization URL and PKCE verifier
	 * @param state Optional state parameter for CSRF protection
	 * @returns Object containing the authorization URL and verifier
	 */
	public getAuthorizationUrl(state?: string): AuthData {
		const verifier = generateCodeVerifier();
		const challenge = generateCodeChallenge(verifier);
		const stateParam = state || this.generateRandomString(16);

		const params = new URLSearchParams({
			response_type: "code",
			client_id: this.config.clientId,
			redirect_uri: this.config.redirectUri,
			scope: this.config.scopes.join(" "),
			code_challenge: challenge,
			code_challenge_method: "S256",
			state: stateParam,
		});

		const url = `${this.config.authorizeUrl}?${params.toString()}`;

		return {
			url,
			verifier,
			state: stateParam,
		};
	}

	/**
	 * Exchanges an authorization code for an access token
	 * @param code Authorization code from the redirect
	 * @param codeVerifier The PKCE code verifier generated in getAuthorizationUrl
	 * @returns Promise resolving to the token response
	 */
	public async exchangeCodeForToken(
		code: string,
		codeVerifier: string,
	): Promise<TokenResponse> {
		const response = await fetch(this.config.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				client_id: this.config.clientId,
				redirect_uri: this.config.redirectUri,
				code,
				code_verifier: codeVerifier,
			}),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(
				`Failed to exchange code for token: ${response.status} ${response.statusText} - ${JSON.stringify(error)}`,
			);
		}

		return response.json();
	}

	/**
	 * Refreshes an access token using a refresh token
	 * @param refreshToken The refresh token from a previous token response
	 * @returns Promise resolving to a new token response
	 */
	public async refreshToken(refreshToken: string): Promise<TokenResponse> {
		const response = await fetch(this.config.tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "refresh_token",
				client_id: this.config.clientId,
				refresh_token: refreshToken,
			}),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(
				`Failed to refresh token: ${response.status} ${response.statusText} - ${JSON.stringify(error)}`,
			);
		}

		return response.json();
	}

	/**
	 * Generates a random string for state parameter
	 * @param length Length of the random string
	 * @returns Random string
	 */
	private generateRandomString(length: number): string {
		const possible =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
		return Array.from(
			{ length },
			() => possible[Math.floor(Math.random() * possible.length)],
		).join("");
	}
}
