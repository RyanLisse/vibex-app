"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useMemo } from "react";

export interface User {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
	role?: string;
}

export interface AuthState {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	error: string | null;
}

export interface AuthActions {
	login: (provider?: string) => Promise<void>;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
}

export interface UseAuthReturn extends AuthState, AuthActions {}

/**
 * Custom hook for authentication state and actions
 *
 * Provides a unified interface for authentication using NextAuth.js
 * with additional state management and error handling.
 */
export function useAuth(): UseAuthReturn {
	const { data: session, status, update } = useSession();

	const user = useMemo((): User | null => {
		if (!session?.user) return null;

		return {
			id: session.user.id || session.user.email || "",
			name: session.user.name,
			email: session.user.email,
			image: session.user.image,
			role: (session.user as any).role || "user",
		};
	}, [session]);

	const isLoading = status === "loading";
	const isAuthenticated = status === "authenticated" && !!user;
	const error = status === "unauthenticated" ? null : null; // Could be enhanced with error tracking

	const login = useCallback(async (provider = "credentials") => {
		try {
			await signIn(provider);
		} catch (error) {
			console.error("Login error:", error);
			throw error;
		}
	}, []);

	const logout = useCallback(async () => {
		try {
			await signOut({ callbackUrl: "/" });
		} catch (error) {
			console.error("Logout error:", error);
			throw error;
		}
	}, []);

	const refresh = useCallback(async () => {
		try {
			await update();
		} catch (error) {
			console.error("Session refresh error:", error);
			throw error;
		}
	}, [update]);

	return {
		user,
		isLoading,
		isAuthenticated,
		error,
		login,
		logout,
		refresh,
	};
}

export default useAuth;
