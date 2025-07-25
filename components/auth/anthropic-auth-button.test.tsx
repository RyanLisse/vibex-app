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
		expect(button).toBeTruthy();
		expect(button.textContent).toContain("Loading...");
		expect(button).toBeDisabled();
		expect(button.getAttribute("data-variant")).toBe("default");
		expect(button.getAttribute("data-size")).toBe("default");
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
		expect(button).toBeTruthy();
		expect(button.textContent).toContain("Login to Claude Max");
		expect(button).not.toBeDisabled();
		expect(screen.getByTestId("login-icon")).toBeTruthy();
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
		expect(button.textContent).toContain("Login to Claude Console");
	});

	it("should render logout button when authenticated", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: new Date(Date.now() + 3600000),
		});

		render(<AnthropicAuthButton />);

		const button = screen.getByTestId("button");
		expect(button).toBeTruthy();
		expect(button.textContent).toContain("Logout");
		expect(button).not.toBeDisabled();
		expect(screen.getByTestId("logout-icon")).toBeTruthy();
	});

	it("should call login when login button is clicked", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton />);

		const button = screen.getByTestId("button");
		fireEvent.click(button);

		expect(mockLogin).toHaveBeenCalledTimes(1);
	});

	it("should call logout when logout button is clicked", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: new Date(Date.now() + 3600000),
		});

		render(<AnthropicAuthButton />);

		const button = screen.getByTestId("button");
		fireEvent.click(button);

		expect(mockLogout).toHaveBeenCalledTimes(1);
	});

	it("should render with custom size", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton size="lg" />);

		const button = screen.getByTestId("button");
		expect(button.getAttribute("data-size")).toBe("lg");
	});

	it("should render with custom variant", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton variant="outline" />);

		const button = screen.getByTestId("button");
		expect(button.getAttribute("data-variant")).toBe("outline");
	});

	it("should show expires info when authenticated", () => {
		const expiresDate = new Date(Date.now() + 3600000);
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: expiresDate,
		});

		render(<AnthropicAuthButton />);

		expect(screen.getByTestId("user-icon")).toBeTruthy();
	});

	it("should handle null expires gracefully", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: true,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton />);

		const button = screen.getByTestId("button");
		expect(button).toBeTruthy();
		expect(button.textContent).toContain("Logout");
	});

	it("should not call login/logout when disabled", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: true,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		render(<AnthropicAuthButton />);

		const button = screen.getByTestId("button");
		fireEvent.click(button);

		expect(mockLogin).not.toHaveBeenCalled();
		expect(mockLogout).not.toHaveBeenCalled();
	});

	it("should render with both mode variations", () => {
		mockUseAnthropicAuth.mockReturnValue({
			authenticated: false,
			loading: false,
			login: mockLogin,
			logout: mockLogout,
			expires: null,
		});

		const { rerender } = render(<AnthropicAuthButton mode="claude" />);
		expect(screen.getByTestId("button").textContent).toContain("Login to Claude Max");

		rerender(<AnthropicAuthButton mode="console" />);
		expect(screen.getByTestId("button").textContent).toContain("Login to Claude Console");
	});
});
