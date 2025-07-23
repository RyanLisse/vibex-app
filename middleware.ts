import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

/**
 * Authentication Middleware
 *
 * Protects routes that require authentication and handles
 * authorization for different user roles and permissions.
 */

// Public routes that don't require authentication
const publicRoutes = ["/", "/login", "/register", "/api/auth", "/api/health", "/api/status"];

// API routes that require authentication
const protectedApiRoutes = ["/api/tasks", "/api/environments", "/api/workflows", "/api/users"];

// Admin-only routes
const adminRoutes = ["/admin", "/api/admin"];

function isPublicRoute(pathname: string): boolean {
	return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isProtectedApiRoute(pathname: string): boolean {
	return protectedApiRoutes.some((route) => pathname.startsWith(route));
}

function isAdminRoute(pathname: string): boolean {
	return adminRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default withAuth(
	function middleware(req: NextRequest) {
		const { pathname } = req.nextUrl;
		const token = req.nextauth.token;

		// Allow public routes
		if (isPublicRoute(pathname)) {
			return NextResponse.next();
		}

		// Check if user is authenticated for protected routes
		if (!token && (isProtectedApiRoute(pathname) || pathname.startsWith("/dashboard"))) {
			if (pathname.startsWith("/api/")) {
				return NextResponse.json({ error: "Authentication required" }, { status: 401 });
			}

			// Redirect to login for web routes
			const loginUrl = new URL("/login", req.url);
			loginUrl.searchParams.set("callbackUrl", pathname);
			return NextResponse.redirect(loginUrl);
		}

		// Check admin access
		if (isAdminRoute(pathname)) {
			const userRole = token?.role as string;
			if (userRole !== "admin") {
				if (pathname.startsWith("/api/")) {
					return NextResponse.json({ error: "Admin access required" }, { status: 403 });
				}
				return NextResponse.redirect(new URL("/unauthorized", req.url));
			}
		}

		// Add security headers
		const response = NextResponse.next();

		response.headers.set("X-Frame-Options", "DENY");
		response.headers.set("X-Content-Type-Options", "nosniff");
		response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
		response.headers.set(
			"Content-Security-Policy",
			"default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
		);

		return response;
	},
	{
		callbacks: {
			authorized: ({ token, req }) => {
				const { pathname } = req.nextUrl;

				// Always allow public routes
				if (isPublicRoute(pathname)) {
					return true;
				}

				// Require token for protected routes
				return !!token;
			},
		},
	}
);

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		"/((?!_next/static|_next/image|favicon.ico|public/).*)",
	],
};
