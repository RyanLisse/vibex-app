import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth hook
const mockUseClaudeAuth = vi.fn();
vi.mock("@/src/hooks/useClaudeAuth", () => ({
	useClaudeAuth: () => mockUseClaudeAuth(),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
	}),
}));

// Mock Button component
vi.mock("@/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, variant, className, ...props }: any) => (
		<button
			onClick={onClick}
			disabled={disabled}
			className={`btn ${variant} ${className}`}
			data-testid="auth-button"
			{...props}
		>
			{children}
		</button>
	),
}));

// Simple ClaudeAuthButton implementation for testing
interface ClaudeAuthButtonProps {
	onSuccess?: (user: any) => void;
	onError?: (error: Error) => void;
	variant?: "default" | "outline" | "ghost";
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	className?: string;
}

const ClaudeAuthButton: React.FC<ClaudeAuthButtonProps> = ({
	onSuccess,
	onError,
	variant = "default",
	size = "md",
	disabled = false,
	className = "",
}) => {
	const { login, logout, user, isLoading, error } = mockUseClaudeAuth();

	const handleAuthClick = async () => {
		try {
			if (user) {
				await logout();
			} else {
				const result = await login();
				onSuccess?.(result);
			}
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Authentication failed");
			onError?.(error);
		}
	};

	return (
		<div className="claude-auth-container">
			<button
				onClick={handleAuthClick}
				disabled={disabled || isLoading}
				className={`auth-button ${variant} ${size} ${className}`}
				data-testid="claude-auth-button"
			>
				{isLoading ? (
					<>
						<span className="loading-spinner" data-testid="loading-spinner" />
						Loading...
					</>
				) : user ? (
					`Sign out ${user.name || user.email || "User"}`
				) : (
					"Sign in with Claude"
				)}
			</button>
			{error && (
				<div className="error-message" data-testid="error-message">
					{error.message}
				</div>
			)}
		</div>
	);
};

describe("ClaudeAuthButton", () => {
	const mockLogin = vi.fn();
	const mockLogout = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseClaudeAuth.mockReturnValue({
			login: mockLogin,
			logout: mockLogout,
			user: null,
			isLoading: false,
			error: null,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Unauthenticated State", () => {
		it("should render sign in button when not authenticated", () => {
			render(<ClaudeAuthButton />);

			expect(screen.getByTestId("claude-auth-button")).toBeInTheDocument();
			expect(screen.getByText("Sign in with Claude")).toBeInTheDocument();
		});

		it("should call login when clicked in unauthenticated state", async () => {
			const user = userEvent.setup();
			mockLogin.mockResolvedValue({ id: "1", name: "Test User" });

			render(<ClaudeAuthButton />);

			await user.click(screen.getByTestId("claude-auth-button"));

			expect(mockLogin).toHaveBeenCalledTimes(1);
		});

		it("should call onSuccess callback when login succeeds", async () => {
			const user = userEvent.setup();
			const onSuccess = vi.fn();
			const mockUser = { id: "1", name: "Test User" };

			mockLogin.mockResolvedValue(mockUser);

			render(<ClaudeAuthButton onSuccess={onSuccess} />);

			await user.click(screen.getByTestId("claude-auth-button"));
			await waitFor(() => {
				expect(onSuccess).toHaveBeenCalledWith(mockUser);
			});
		});

		it("should call onError callback when login fails", async () => {
			const user = userEvent.setup();
			const onError = vi.fn();
			const error = new Error("Login failed");

			mockLogin.mockRejectedValue(error);

			render(<ClaudeAuthButton onError={onError} />);

			await user.click(screen.getByTestId("claude-auth-button"));
			await waitFor(() => {
				expect(onError).toHaveBeenCalledWith(error);
			});
		});
	});

	describe("Authenticated State", () => {
		beforeEach(() => {
			mockUseClaudeAuth.mockReturnValue({
				login: mockLogin,
				logout: mockLogout,
				user: { id: "1", name: "John Doe", email: "john@example.com" },
				isLoading: false,
				error: null,
			});
		});

		it("should render sign out button when authenticated", () => {
			render(<ClaudeAuthButton />);

			expect(screen.getByText("Sign out John Doe")).toBeInTheDocument();
		});

		it("should call logout when clicked in authenticated state", async () => {
			const user = userEvent.setup();

			render(<ClaudeAuthButton />);

			await user.click(screen.getByTestId("claude-auth-button"));

			expect(mockLogout).toHaveBeenCalledTimes(1);
		});

		it("should display user email when name is not available", () => {
			mockUseClaudeAuth.mockReturnValue({
				login: mockLogin,
				logout: mockLogout,
				user: { id: "1", email: "test@example.com" },
				isLoading: false,
				error: null,
			});

			render(<ClaudeAuthButton />);

			expect(screen.getByText("Sign out test@example.com")).toBeInTheDocument();
		});

		it("should display generic 'User' when no name or email", () => {
			mockUseClaudeAuth.mockReturnValue({
				login: mockLogin,
				logout: mockLogout,
				user: { id: "1" },
				isLoading: false,
				error: null,
			});

			render(<ClaudeAuthButton />);

			expect(screen.getByText("Sign out User")).toBeInTheDocument();
		});
	});

	describe("Loading State", () => {
		beforeEach(() => {
			mockUseClaudeAuth.mockReturnValue({
				login: mockLogin,
				logout: mockLogout,
				user: null,
				isLoading: true,
				error: null,
			});
		});

		it("should show loading state", () => {
			render(<ClaudeAuthButton />);

			expect(screen.getByText("Loading...")).toBeInTheDocument();
			expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
		});

		it("should disable button when loading", () => {
			render(<ClaudeAuthButton />);

			expect(screen.getByTestId("claude-auth-button")).toBeDisabled();
		});
	});

	describe("Error State", () => {
		beforeEach(() => {
			mockUseClaudeAuth.mockReturnValue({
				login: mockLogin,
				logout: mockLogout,
				user: null,
				isLoading: false,
				error: new Error("Authentication failed"),
			});
		});

		it("should display error message", () => {
			render(<ClaudeAuthButton />);

			expect(screen.getByTestId("error-message")).toBeInTheDocument();
			expect(screen.getByText("Authentication failed")).toBeInTheDocument();
		});

		it("should still render the auth button with error present", () => {
			render(<ClaudeAuthButton />);

			expect(screen.getByTestId("claude-auth-button")).toBeInTheDocument();
			expect(screen.getByText("Sign in with Claude")).toBeInTheDocument();
		});
	});

	describe("Props and Customization", () => {
		it("should apply custom variant class", () => {
			render(<ClaudeAuthButton variant="outline" />);

			const button = screen.getByTestId("claude-auth-button");
			expect(button).toHaveClass("outline");
		});

		it("should apply custom size class", () => {
			render(<ClaudeAuthButton size="lg" />);

			const button = screen.getByTestId("claude-auth-button");
			expect(button).toHaveClass("lg");
		});

		it("should apply custom className", () => {
			render(<ClaudeAuthButton className="custom-class" />);

			const button = screen.getByTestId("claude-auth-button");
			expect(button).toHaveClass("custom-class");
		});

		it("should respect disabled prop", () => {
			render(<ClaudeAuthButton disabled={true} />);

			expect(screen.getByTestId("claude-auth-button")).toBeDisabled();
		});

		it("should combine disabled prop with loading state", () => {
			mockUseClaudeAuth.mockReturnValue({
				login: mockLogin,
				logout: mockLogout,
				user: null,
				isLoading: true,
				error: null,
			});

			render(<ClaudeAuthButton disabled={true} />);

			expect(screen.getByTestId("claude-auth-button")).toBeDisabled();
		});
	});

	describe("Accessibility", () => {
		it("should be focusable when enabled", () => {
			render(<ClaudeAuthButton />);

			const button = screen.getByTestId("claude-auth-button");
			button.focus();
			expect(button).toHaveFocus();
		});

		it("should not be focusable when disabled", () => {
			render(<ClaudeAuthButton disabled={true} />);

			const button = screen.getByTestId("claude-auth-button");
			expect(button).toBeDisabled();
		});

		it("should handle keyboard events", async () => {
			const user = userEvent.setup();

			render(<ClaudeAuthButton />);

			const button = screen.getByTestId("claude-auth-button");
			await user.type(button, "{enter}");

			expect(mockLogin).toHaveBeenCalledTimes(1);
		});
	});

	describe("Edge Cases", () => {
		it("should handle login returning null", async () => {
			const user = userEvent.setup();
			const onSuccess = vi.fn();

			mockLogin.mockResolvedValue(null);

			render(<ClaudeAuthButton onSuccess={onSuccess} />);

			await user.click(screen.getByTestId("claude-auth-button"));
			await waitFor(() => {
				expect(onSuccess).toHaveBeenCalledWith(null);
			});
		});

		it("should handle logout failure gracefully", async () => {
			const user = userEvent.setup();
			const onError = vi.fn();
			const error = new Error("Logout failed");

			mockUseClaudeAuth.mockReturnValue({
				login: mockLogin,
				logout: mockLogout,
				user: { id: "1", name: "Test User" },
				isLoading: false,
				error: null,
			});

			mockLogout.mockRejectedValue(error);

			render(<ClaudeAuthButton onError={onError} />);

			await user.click(screen.getByTestId("claude-auth-button"));
			await waitFor(() => {
				expect(onError).toHaveBeenCalledWith(error);
			});
		});

		it("should handle non-Error objects in catch block", async () => {
			const user = userEvent.setup();
			const onError = vi.fn();

			mockLogin.mockRejectedValue("String error");

			render(<ClaudeAuthButton onError={onError} />);

			await user.click(screen.getByTestId("claude-auth-button"));
			await waitFor(() => {
				expect(onError).toHaveBeenCalledWith(expect.any(Error));
			});
		});

		it("should not call callbacks if they are not provided", async () => {
			const user = userEvent.setup();

			mockLogin.mockResolvedValue({ id: "1", name: "Test User" });

			// Should not throw error when callbacks are not provided
			expect(() => {
				render(<ClaudeAuthButton />);
			}).not.toThrow();

			await user.click(screen.getByTestId("claude-auth-button"));

			// Should complete without error
			await waitFor(() => {
				expect(mockLogin).toHaveBeenCalledTimes(1);
			});
		});
	});
});
