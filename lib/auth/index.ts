import fs from "node:fs/promises";
import path from "node:path";
import { TokenValidationConfig
} from "../auth";
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
	import { refreshAuthToken,
	import { revokeToken,
	import { sanitizeRedirectUrl,
	import { validateOAuthState,
	import { validateToken
} from "../auth";
