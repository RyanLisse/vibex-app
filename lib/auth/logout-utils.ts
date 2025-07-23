/**
 * Shared Authentication Logout Utilities
 * Reduces code duplication across OAuth providers
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export interface LogoutConfig {
  /** Provider name for error messages */
  providerName: string;
  /** Cookie names to clear */
  cookiesToClear: string[];
  /** Client ID for token revocation */
  clientId?: string;
  /** Client secret for token revocation */
  clientSecret?: string;
  /** Default redirect URI */
  defaultRedirectUri: string;
  /** Token revocation function */
  revokeTokenFn?: (params: {
    token: string;
    clientId: string;
    clientSecret: string;
  }) => Promise<void>;
}

export interface LogoutParams {
  /** Redirect URI from request */
  redirectUri?: string | null;
  /** Whether to revoke the token */
  revokeToken?: boolean;
  /** Token to revoke (from body or cookie) */
  token?: string;
}

/**
 * Clear authentication cookies with secure options
 */
export function clearAuthCookies(
  response: NextResponse,
  cookiesToClear: string[]
): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0, // Expire immediately
  };

  for (const cookieName of cookiesToClear) {
    response.cookies.set(cookieName, "", cookieOptions);
  }
}

/**
 * Handle logout errors consistently
 */
export function handleLogoutError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Create logout response with consistent structure
 */
export function createLogoutResponse(params: {
  success: boolean;
  message: string;
  redirectUri: string;
  tokenRevoked?: boolean;
  error?: string;
  revokeError?: string;
}): NextResponse {
  const responseData: any = {
    success: params.success,
    message: params.message,
    redirect_uri: params.redirectUri,
  };

  if (params.tokenRevoked !== undefined) {
    responseData.token_revoked = params.tokenRevoked;
  }

  if (params.error) {
    responseData.error = params.error;
  }

  if (params.revokeError) {
    responseData.revoke_error = params.revokeError;
  }

  return NextResponse.json(responseData);
}

/**
 * Handle GET logout request
 */
export async function handleGetLogout(
  request: NextRequest,
  config: LogoutConfig
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get("redirect_uri") || config.defaultRedirectUri;

    // Get token from cookie
    const token = request.cookies.get(config.cookiesToClear[0])?.value;

    // Create logout response
    const response = createLogoutResponse({
      success: true,
      message: `Logged out from ${config.providerName} successfully`,
      redirectUri,
    });

    // Clear authentication cookies
    clearAuthCookies(response, config.cookiesToClear);

    // Attempt to revoke token if available and revocation function provided
    if (
      token &&
      config.clientId &&
      config.clientSecret &&
      config.revokeTokenFn
    ) {
      try {
        await config.revokeTokenFn({
          token,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
        });
      } catch (revokeError) {
        // Log error but don't fail the logout
        console.warn(`Failed to revoke ${config.providerName} token:`, revokeError);
      }
    }

    return response;
  } catch (error) {
    // Even if logout fails, clear cookies and return success
    const response = createLogoutResponse({
      success: true,
      message: `Logged out from ${config.providerName} successfully (with errors)`,
      redirectUri: config.defaultRedirectUri,
      error: handleLogoutError(error),
    });

    clearAuthCookies(response, config.cookiesToClear);
    return response;
  }
}

/**
 * Handle POST logout request
 */
export async function handlePostLogout(
  request: NextRequest,
  config: LogoutConfig
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      redirect_uri,
      revoke_token: shouldRevokeToken = true,
      token: tokenFromBody,
    } = body;

    // Get token from cookie or request body
    const tokenFromCookie = request.cookies.get(config.cookiesToClear[0])?.value;
    const token = tokenFromBody || tokenFromCookie;
    const redirectUri = redirect_uri || config.defaultRedirectUri;

    // Create base response
    let response = createLogoutResponse({
      success: true,
      message: `Logged out from ${config.providerName} successfully`,
      redirectUri,
      tokenRevoked: false,
    });

    // Clear authentication cookies first
    clearAuthCookies(response, config.cookiesToClear);

    // Attempt to revoke token if requested and available
    if (
      shouldRevokeToken &&
      token &&
      config.clientId &&
      config.clientSecret &&
      config.revokeTokenFn
    ) {
      try {
        await config.revokeTokenFn({
          token,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
        });

        // Update response to indicate token was revoked
        response = createLogoutResponse({
          success: true,
          message: `Logged out from ${config.providerName} and token revoked successfully`,
          redirectUri,
          tokenRevoked: true,
        });
        clearAuthCookies(response, config.cookiesToClear);
      } catch (revokeError) {
        // Log error but don't fail the logout
        console.warn(`Failed to revoke ${config.providerName} token:`, revokeError);

        response = createLogoutResponse({
          success: true,
          message: `Logged out from ${config.providerName} successfully (token revocation failed)`,
          redirectUri,
          tokenRevoked: false,
          revokeError: handleLogoutError(revokeError),
        });
        clearAuthCookies(response, config.cookiesToClear);
      }
    }

    return response;
  } catch (error) {
    // Even if logout fails, clear cookies and return success
    const response = createLogoutResponse({
      success: true,
      message: `Logged out from ${config.providerName} successfully (with errors)`,
      redirectUri: config.defaultRedirectUri,
      error: handleLogoutError(error),
    });

    clearAuthCookies(response, config.cookiesToClear);
    return response;
  }
}

/**
 * Generic logout handler that handles both GET and POST requests
 */
export async function handleLogout(
  request: NextRequest,
  config: LogoutConfig
): Promise<NextResponse> {
  if (request.method === "GET") {
    return handleGetLogout(request, config);
  } else if (request.method === "POST") {
    return handlePostLogout(request, config);
  } else {
    return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }
}