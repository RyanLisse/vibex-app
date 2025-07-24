import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AnthropicAuthButton } from "./anthropic-auth-button";

// Mock the anthropic auth hook
const mockUseAnthropicAuth = vi.fn();
// vi.mock("@/hooks/use-anthropic-auth", () => ({
// 	useAnthropicAuth: () => mockUseAnthropicAuth(),
// }));

// Mock Lucide React icons
// vi.mock("lucide-react", () => ({
// 	LogIn: ({ className, ...props }: any) => (
// <svg className={className} data-testid="login-icon" {...props} />
// ),
// 	LogOut: ({ className, ...props }: any) => (
// <svg className={className} data-testid="logout-icon" {...props} />
// ),
// 	User: ({ className, ...props }: any) => (
// <svg className={className} data-testid="user-icon" {...props} />
// ),
// }));

// Mock Button component
// vi.mock("@/components/ui/button", () => ({
// 	Button: ({ children, onClick, variant, size, disabled, ...props }: any) => (
// <button
// data-size={size}
// data-testid="button"
// data-variant={variant}
// disabled={disabled}
// onClick={onClick}
// {...props}
// >
// {children}
// </button>
// ),
// }));

describe.skip("AnthropicAuthButton", () => {
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
			expires: null,
		});

		render(<AnthropicAuthButton />);

		const button = screen.getByTestId("button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("Loading...");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("data-variant", "default");
		expect(button).toHaveAttribute("data-size", "default");
	});

	it("should render login button when not authenticated", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton />);

		const button = screen.getByTestId("button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("Login to Claude Max");
		expect(button).not.toBeDisabled();
		expect(screen.getByTestId("login-icon")).toBeInTheDocument();
	});

	it("should render login button with console mode", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton mode="console" />);

		const button = screen.getByTestId("button");
		expect(button).toHaveTextContent("Login to Claude Console");
	});

	it("should handle login button click", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton mode="max" />);

		const button = screen.getByTestId("button");
		fireEvent.click(button);

		expect(mockLogin).toHaveBeenCalledWith("max");
		expect(mockLogin).toHaveBeenCalledTimes(1);
	});

	it("should render authenticated state with user info", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: Date.now() + 3_600_000, // 1 hour from now
		});

		render(<AnthropicAuthButton mode="max" />);

		expect(screen.getByTestId("user-icon")).toBeInTheDocument();
		expect(screen.getByText("Claude Max")).toBeInTheDocument();
		expect(screen.getByText("Logout")).toBeInTheDocument();
		expect(screen.getByTestId("logout-icon")).toBeInTheDocument();
	});

	it("should render authenticated state with console mode", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: Date.now() + 3_600_000,
		});

		render(<AnthropicAuthButton mode="console" />);

		expect(screen.getByText("Claude Console")).toBeInTheDocument();
	});

	it("should show expiration warning when expires soon", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: Date.now() + 240_000, // 4 minutes from now (less than 5 minutes)
		});

		render(<AnthropicAuthButton />);

		expect(screen.getByText("(Expires soon)")).toBeInTheDocument();
		expect(screen.getByText("(Expires soon)")).toHaveClass("text-amber-600");
	});

	it("should not show expiration warning when not expiring soon", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: Date.now() + 600_000, // 10 minutes from now
		});

		render(<AnthropicAuthButton />);

		expect(screen.queryByText("(Expires soon)")).not.toBeInTheDocument();
	});

	it("should handle logout button click", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: Date.now() + 3_600_000,
		});

		render(<AnthropicAuthButton />);

		const logoutButton = screen.getByText("Logout").closest("button");
		fireEvent.click(logoutButton!);

		expect(mockLogout).toHaveBeenCalledTimes(1);
	});

	it("should apply custom variant and size", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton size="lg" variant="outline" />);

		const button = screen.getByTestId("button");
		expect(button).toHaveAttribute("data-variant", "outline");
		expect(button).toHaveAttribute("data-size", "lg");
	});

	it("should apply custom variant and size to logout button", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: Date.now() + 3_600_000,
		});

		render(<AnthropicAuthButton size="sm" variant="ghost" />);

		const logoutButton = screen.getByText("Logout").closest("button");
		expect(logoutButton).toHaveAttribute("data-variant", "outline");
		expect(logoutButton).toHaveAttribute("data-size", "sm");
	});

	it("should render user info with proper styling", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: Date.now() + 3_600_000,
		});

		render(<AnthropicAuthButton />);

		const userInfo = screen.getByText("Claude Max").closest("div");
		expect(userInfo).toHaveClass("flex", "items-center", "gap-1", "text-sm", "text-green-600");
	});

	it("should handle authentication state transitions", () => {
		// Start unauthenticated
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		const { rerender } = render(<AnthropicAuthButton />);
		expect(screen.getByText("Login to Claude Max")).toBeInTheDocument();

		// Transition to authenticated
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: Date.now() + 3_600_000,
		});

		rerender(<AnthropicAuthButton />);
		expect(screen.getByText("Claude Max")).toBeInTheDocument();
		expect(screen.getByText("Logout")).toBeInTheDocument();
	});

	it("should handle missing expires value", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton />);

		expect(screen.getByText("Claude Max")).toBeInTheDocument();
		expect(screen.queryByText("(Expires soon)")).not.toBeInTheDocument();
	});

	it("should handle undefined expires value", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: undefined,
		});

		render(<AnthropicAuthButton />);

		expect(screen.getByText("Claude Max")).toBeInTheDocument();
		expect(screen.queryByText("(Expires soon)")).not.toBeInTheDocument();
	});

	it("should have proper container structure when authenticated", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: Date.now() + 3_600_000,
		});

		render(<AnthropicAuthButton />);

		const container = screen.getByText("Claude Max").closest("div")?.parentElement;
		expect(container).toHaveClass("flex", "items-center", "gap-2");
	});

	it("should handle all mode options", () => {
		// Test max mode
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		const { rerender } = render(<AnthropicAuthButton mode="max" />);
		expect(screen.getByText("Login to Claude Max")).toBeInTheDocument();

		// Test console mode
		rerender(<AnthropicAuthButton mode="console" />);
		expect(screen.getByText("Login to Claude Console")).toBeInTheDocument();

		// Test default mode
		rerender(<AnthropicAuthButton />);
		expect(screen.getByText("Login to Claude Max")).toBeInTheDocument();
	});
});
