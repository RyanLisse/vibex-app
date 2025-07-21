/**
 * Claude Auth Client - Stub implementation for testing
 */

export class ClaudeAuthClient {
	constructor() {
		// Stub implementation
	}

	async authenticate() {
		return { success: true, token: "test-token" };
	}

	async logout() {
		return { success: true };
	}

	getToken() {
		return "test-token";
	}

	isAuthenticated() {
		return true;
	}
}

export default ClaudeAuthClient;
