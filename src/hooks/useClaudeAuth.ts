import { useCallback, useState } from "react";

interface User {
	id: string;
	name?: string;
	email?: string;
}

export function useClaudeAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const login = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Simulate authentication process
			// In a real implementation, this would integrate with Claude's OAuth
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const mockUser: User = {
				id: "claude-user-123",
				name: "Claude User",
				email: "user@claude.ai",
			};

			setUser(mockUser);
			return mockUser;
		} catch (err) {
			const authError = err instanceof Error ? err : new Error("Login failed");
			setError(authError);
			throw authError;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const logout = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Simulate logout process
			await new Promise((resolve) => setTimeout(resolve, 500));

			setUser(null);
		} catch (err) {
			const authError = err instanceof Error ? err : new Error("Logout failed");
			setError(authError);
			throw authError;
		} finally {
			setIsLoading(false);
		}
	}, []);

	return {
		user,
		isLoading,
		error,
		login,
		logout,
	};
}

export default useClaudeAuth;
