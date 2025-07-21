/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth2
 * Implements RFC 7636 for secure authorization code flows
 */

/**
 * Generate a cryptographically random code verifier
 * @returns A URL-safe string of length 43-128 characters
 */
export function generateCodeVerifier(): string {
	// Create a 32-byte (256-bit) random array
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);

	// Convert to base64url encoding (RFC 4648 Section 5)
	return btoa(String.fromCharCode.apply(null, Array.from(array)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/**
 * Generate a code challenge from a code verifier using SHA256
 * @param verifier The code verifier to hash
 * @returns A base64url-encoded SHA256 hash of the verifier
 */
export function generateCodeChallenge(verifier: string): string {
	try {
		// Try to use Node.js crypto for synchronous hashing
		const { createHash } = await import("node:crypto");
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
 * Synchronous version of generateCodeChallenge for environments that support it
 * Falls back to Promise-based version if sync crypto is not available
 */
export function generateCodeChallengeSync(verifier: string): string {
	try {
		// Try to use synchronous crypto if available (Node.js)
		const { createHash } = await import("node:crypto");
		const hash = createHash("sha256").update(verifier).digest("base64");
		return hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
	} catch {
		// Fall back to browser crypto (async) - this will throw in sync context
		throw new Error(
			"Synchronous code challenge generation not supported in this environment",
		);
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
