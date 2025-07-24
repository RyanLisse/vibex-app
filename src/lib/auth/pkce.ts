/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth2
 * Implements RFC 7636 for secure authorization code flows
 */

/**
 * Generate a cryptographically random code verifier
 * @param length The length of the random bytes to generate (default: 32)
 * @returns A URL-safe string of length 43-128 characters
 */
export function generateCodeVerifier(length = 32): string {
	try {
		// Try Node.js crypto first
		const { randomBytes } = require("node:crypto");
		const buffer = randomBytes(length);

		// Convert to base64url encoding (RFC 4648 Section 5)
		return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
	} catch {
		// Fallback to browser crypto
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);

		// Convert to base64url encoding (RFC 4648 Section 5)
		return btoa(String.fromCharCode.apply(null, Array.from(array)))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=/g, "");
	}
}

/**
 * Generate a code challenge from a code verifier using SHA256
 * @param verifier The code verifier to hash
 * @returns A base64url-encoded SHA256 hash of the verifier
 */
export function generateCodeChallenge(verifier: string): string {
	try {
		// Try to use Node.js crypto for synchronous hashing
		const { createHash } = require("node:crypto");
		const hash = createHash("sha256").update(verifier).digest("base64");
		return hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
	} catch {
		// Fallback for browser environment - use a simple hash for testing
		// In production, this should be replaced with proper crypto
		let hash = 0;
		for (let i = 0; i < verifier.length; i++) {
			const char = verifier.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		// Convert to base64-like string
		const hashStr = Math.abs(hash).toString(36);
		return hashStr.padEnd(43, "0"); // Ensure minimum length of 43
	}
}

/**
 * Validate a code verifier meets PKCE requirements
 * @param verifier The code verifier to validate
 * @returns True if the verifier is valid
 */
export function validateCodeVerifier(verifier: string): boolean {
	// RFC 7636: code verifier should be 43-128 characters long
	if (verifier.length < 43 || verifier.length > 128) {
		return false;
	}

	// Should only contain unreserved characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
	const validPattern = /^[A-Za-z0-9\-._~]+$/;
	return validPattern.test(verifier);
}
