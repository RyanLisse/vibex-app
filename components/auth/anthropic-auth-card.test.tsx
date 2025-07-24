import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AnthropicAuthCard } from "./anthropic-auth-card";

// Mock the anthropic auth hook
const mockUseAnthropicAuth = vi.fn();
vi.mock("@/hooks/use-anthropic-auth", () => ({
	useAnthropicAuth: () => mockUseAnthropicAuth(),
}));

// Mock the auth card base component
vi.mock("./auth-card-base", () => ({
	AuthCardBase: ({
		title,
		description,
		loading,
		authenticated,
		error,
		expires,
		authType,
		isExpiringSoon,
		onLogout,
		onRetry,
		authenticatedContent,
		unauthenticatedContent,
		children,
	}: any) => (
		<div data-testid="auth-card-base">
			<h3 data-testid="title">{title}</h3>
			{description && <p data-testid="description">{description}</p>}
			{loading && <div data-testid="loading">Loading...</div>}
			{error && <div data-testid="error">{error}</div>}
			{authenticated && <div data-testid="authenticated">Authenticated</div>}
			{expires && <div data-testid="expires">{expires}</div>}
			{authType && <div data-testid="auth-type">{authType}</div>}
			{isExpiringSoon && <div data-testid="expiring-soon">Expiring soon</div>}
			{onLogout && (
				<button data-testid="logout-btn" onClick={onLogout}>
					Logout
				</button>
			)}
			{onRetry && (
				<button data-testid="retry-btn" onClick={onRetry}>
					Retry
				</button>
			)}
			{authenticatedContent && (
				<div data-testid="authenticated-content">{authenticatedContent}</div>
			)}
			{unauthenticatedContent && (
				<div data-testid="unauthenticated-content">{unauthenticatedContent}</div>
			)}
			{children && <div data-testid="children">{children}</div>}
		</div>
	),
}));

// Mock Lucide React icons
vi.mock("lucide-react", () => ({
	LogIn: ({ className, ...props }: any) => (
		<svg className={className} data-testid="login-icon" {...props} />
	),
	ExternalLink: ({ className, ...props }: any) => (
		<svg className={className} data-testid="external-link-icon" {...props} />
	),
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
	Button: ({ children, onClick, variant, className, ...props }: any) => (
		<button
			className={className}
			data-testid="button"
			data-variant={variant}
			onClick={onClick}
			{...props}
		>
			{children}
		</button>
	),
}));

describe("AnthropicAuthCard", () => {
	const mockLogin = vi.fn();
	const mockLogout = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should render loading state", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: true,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("auth-card-base")).toBeInTheDocument();
		expect(screen.getByTestId("title")).toHaveTextContent("Anthropic Authentication");
		expect(screen.getByTestId("loading")).toBeInTheDocument();
	});

	it("should render unauthenticated state", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("auth-card-base")).toBeInTheDocument();
		expect(screen.getByTestId("title")).toHaveTextContent("Anthropic Authentication");
		expect(screen.getByTestId("unauthenticated-content")).toBeInTheDocument();
		expect(screen.getByTestId("button")).toHaveTextContent("Sign in with Anthropic");
		expect(screen.getByTestId("login-icon")).toBeInTheDocument();
		expect(screen.getByTestId("external-link-icon")).toBeInTheDocument();
	});

	it("should handle login button click", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		const loginButton = screen.getByTestId("button");
		fireEvent.click(loginButton);

		expect(mockLogin).toHaveBeenCalledTimes(1);
	});

	it("should render authenticated state", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: { email: "test@example.com" },
			error: null,
			expires: Date.now() + 3_600_000,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("auth-card-base")).toBeInTheDocument();
		expect(screen.getByTestId("title")).toHaveTextContent("Anthropic Authentication");
		expect(screen.getByTestId("authenticated")).toBeInTheDocument();
		expect(screen.getByTestId("expires")).toBeInTheDocument();
		expect(screen.getByTestId("auth-type")).toHaveTextContent("OAuth");
	});

	it("should render expiring soon warning", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: { email: "test@example.com" },
			error: null,
			expires: Date.now() + 300_000, // 5 minutes
			isExpiring: true,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("expiring-soon")).toBeInTheDocument();
	});

	it("should render error state", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: "Authentication failed",
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("error")).toHaveTextContent("Authentication failed");
	});

	it("should handle logout", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: { email: "test@example.com" },
			error: null,
			expires: Date.now() + 3_600_000,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		const logoutButton = screen.getByTestId("logout-btn");
		fireEvent.click(logoutButton);

		expect(mockLogout).toHaveBeenCalledTimes(1);
	});

	it("should handle retry after error", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: "Network error",
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		const retryButton = screen.getByTestId("retry-btn");
		fireEvent.click(retryButton);

		expect(mockLogin).toHaveBeenCalledTimes(1);
	});

	it("should render with custom description", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard description="Custom description" />);

		expect(screen.getByTestId("description")).toHaveTextContent("Custom description");
	});

	it("should handle user with name", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: { name: "Test User", email: "test@example.com" },
			error: null,
			expires: Date.now() + 3_600_000,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("authenticated-content")).toBeInTheDocument();
	});

	it("should handle user without email", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: { name: "Test User" },
			error: null,
			expires: Date.now() + 3_600_000,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("authenticated-content")).toBeInTheDocument();
	});

	it("should handle null user when authenticated", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: Date.now() + 3_600_000,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("authenticated")).toBeInTheDocument();
	});

	it("should handle expired token", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: Date.now() - 1000, // expired
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("unauthenticated-content")).toBeInTheDocument();
	});

	it("should handle authentication state transitions", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: null,
			isExpiring: false,
		});

		const { rerender } = render(<AnthropicAuthCard />);
		expect(screen.getByTestId("unauthenticated-content")).toBeInTheDocument();

		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: { email: "test@example.com" },
			error: null,
			expires: Date.now() + 3_600_000,
			isExpiring: false,
		});

		rerender(<AnthropicAuthCard />);
		expect(screen.getByTestId("authenticated")).toBeInTheDocument();
	});

	it("should handle multiple rapid clicks", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		const loginButton = screen.getByTestId("button");
		fireEvent.click(loginButton);
		fireEvent.click(loginButton);
		fireEvent.click(loginButton);

		expect(mockLogin).toHaveBeenCalledTimes(3);
	});

	it("should render login button with correct styling", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		const loginButton = screen.getByTestId("button");
		expect(loginButton).toHaveAttribute("data-variant", "default");
		expect(loginButton).toHaveClass("w-full");
	});

	it("should handle loading state during login", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: true,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("loading")).toBeInTheDocument();
		expect(screen.queryByTestId("unauthenticated-content")).not.toBeInTheDocument();
	});

	it("should handle custom title", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: null,
			error: null,
			expires: null,
			isExpiring: false,
		});

		render(<AnthropicAuthCard title="Custom Auth Title" />);

		expect(screen.getByTestId("title")).toHaveTextContent("Custom Auth Title");
	});

	it("should handle complex user object", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			user: {
				id: "user-123",
				name: "Test User",
				email: "test@example.com",
				organization: "Test Org",
				credits: 100,
				plan: "pro",
			},
			error: null,
			expires: Date.now() + 3_600_000,
			isExpiring: false,
		});

		render(<AnthropicAuthCard />);

		expect(screen.getByTestId("authenticated-content")).toBeInTheDocument();
	});
});
