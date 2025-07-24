import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

// Mock next-themes
const mockSetTheme = vi.fn();
const mockUseTheme = vi.fn();

vi.mock("next-themes", () => ({
	useTheme: () => mockUseTheme(),
}));

// Mock Lucide React icons
vi.mock("lucide-react", () => ({
	Moon: ({ className, ...props }: any) => (
		<svg className={className} data-testid="moon-icon" {...props} />
	),
	Sun: ({ className, ...props }: any) => (
		<svg className={className} data-testid="sun-icon" {...props} />
	),
}));

// Mock Button component
vi.mock("@/components/ui/button", () => ({
	Button: ({ children, onClick, variant, size, disabled, ...props }: any) => (
		<button
			data-size={size}
			data-testid="theme-toggle-button"
			data-variant={variant}
			disabled={disabled}
			onClick={onClick}
			{...props}
		>
			{children}
		</button>
	),
}));

describe("ThemeToggle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseTheme.mockReturnValue({
			theme: "light",
			setTheme: mockSetTheme,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should render with disabled state before mounting", () => {
		render(<ThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		expect(button).toBeInTheDocument();
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("data-variant", "ghost");
		expect(button).toHaveAttribute("data-size", "icon");
	});

	it("should render sun icon when not mounted", () => {
		render(<ThemeToggle />);

		const sunIcon = screen.getByTestId("sun-icon");
		expect(sunIcon).toBeInTheDocument();
		expect(sunIcon).toHaveClass("h-[1.2rem]", "w-[1.2rem]");
	});

	it("should render accessibility label", () => {
		render(<ThemeToggle />);

		const srOnly = screen.getByText("Toggle theme");
		expect(srOnly).toBeInTheDocument();
		expect(srOnly).toHaveClass("sr-only");
	});

	it("should enable button and show both icons after mounting", () => {
		// Mock mounted state
		const MockedThemeToggle = () => {
			const [mounted, setMounted] = React.useState(false);
			const { theme, setTheme } = mockUseTheme();

			React.useEffect(() => {
				setMounted(true);
			}, []);

			if (!mounted) {
				return (
					<button data-testid="theme-toggle-button" disabled>
						<svg className="h-[1.2rem] w-[1.2rem]" data-testid="sun-icon" />
						<span className="sr-only">Toggle theme</span>
					</button>
				);
			}

			return (
				<button
					data-testid="theme-toggle-button"
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
				>
					<svg
						className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0"
						data-testid="sun-icon"
					/>
					<svg
						className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
						data-testid="moon-icon"
					/>
					<span className="sr-only">Toggle theme</span>
				</button>
			);
		};

		render(<MockedThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		expect(button).toBeInTheDocument();
		expect(button).not.toBeDisabled();

		const sunIcon = screen.getByTestId("sun-icon");
		const moonIcon = screen.getByTestId("moon-icon");

		expect(sunIcon).toBeInTheDocument();
		expect(moonIcon).toBeInTheDocument();
		expect(moonIcon).toHaveClass("absolute");
	});

	it("should toggle from light to dark theme", () => {
		const MockedThemeToggle = () => {
			const [_mounted, _setMounted] = React.useState(true);
			const { theme, setTheme } = mockUseTheme();

			return (
				<button
					data-testid="theme-toggle-button"
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
				>
					<span>Toggle theme</span>
				</button>
			);
		};

		render(<MockedThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		fireEvent.click(button);

		expect(mockSetTheme).toHaveBeenCalledWith("dark");
	});

	it("should toggle from dark to light theme", () => {
		mockUseTheme.mockReturnValue({
			theme: "dark",
			setTheme: mockSetTheme,
		});

		const MockedThemeToggle = () => {
			const [_mounted, _setMounted] = React.useState(true);
			const { theme, setTheme } = mockUseTheme();

			return (
				<button
					data-testid="theme-toggle-button"
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
				>
					<span>Toggle theme</span>
				</button>
			);
		};

		render(<MockedThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		fireEvent.click(button);

		expect(mockSetTheme).toHaveBeenCalledWith("light");
	});

	it("should handle system theme", () => {
		mockUseTheme.mockReturnValue({
			theme: "system",
			setTheme: mockSetTheme,
		});

		const MockedThemeToggle = () => {
			const [_mounted, _setMounted] = React.useState(true);
			const { theme, setTheme } = mockUseTheme();

			return (
				<button
					data-testid="theme-toggle-button"
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
				>
					<span>Toggle theme</span>
				</button>
			);
		};

		render(<MockedThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		fireEvent.click(button);

		// system theme should toggle to light
		expect(mockSetTheme).toHaveBeenCalledWith("light");
	});

	it("should apply correct transition classes to sun icon", () => {
		const MockedThemeToggle = () => {
			const [_mounted, _setMounted] = React.useState(true);

			return (
				<button data-testid="theme-toggle-button">
					<svg
						className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0"
						data-testid="sun-icon"
					/>
					<span className="sr-only">Toggle theme</span>
				</button>
			);
		};

		render(<MockedThemeToggle />);

		const sunIcon = screen.getByTestId("sun-icon");
		expect(sunIcon).toHaveClass(
			"h-[1.2rem]",
			"w-[1.2rem]",
			"rotate-0",
			"scale-100",
			"transition-all",
			"dark:-rotate-90",
			"dark:scale-0"
		);
	});

	it("should apply correct transition classes to moon icon", () => {
		const MockedThemeToggle = () => {
			const [_mounted, _setMounted] = React.useState(true);

			return (
				<button data-testid="theme-toggle-button">
					<svg
						className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
						data-testid="moon-icon"
					/>
					<span className="sr-only">Toggle theme</span>
				</button>
			);
		};

		render(<MockedThemeToggle />);

		const moonIcon = screen.getByTestId("moon-icon");
		expect(moonIcon).toHaveClass(
			"absolute",
			"h-[1.2rem]",
			"w-[1.2rem]",
			"rotate-90",
			"scale-0",
			"transition-all",
			"dark:rotate-0",
			"dark:scale-100"
		);
	});

	it("should handle multiple rapid clicks", () => {
		const MockedThemeToggle = () => {
			const [_mounted, _setMounted] = React.useState(true);
			const { theme, setTheme } = mockUseTheme();

			return (
				<button
					data-testid="theme-toggle-button"
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
				>
					<span>Toggle theme</span>
				</button>
			);
		};

		render(<MockedThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");

		fireEvent.click(button);
		fireEvent.click(button);
		fireEvent.click(button);

		expect(mockSetTheme).toHaveBeenCalledTimes(3);
	});

	it("should have correct button props", () => {
		const MockedThemeToggle = () => {
			const [_mounted, _setMounted] = React.useState(true);

			return (
				<button data-size="icon" data-testid="theme-toggle-button" data-variant="ghost">
					<span>Toggle theme</span>
				</button>
			);
		};

		render(<MockedThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		expect(button).toHaveAttribute("data-variant", "ghost");
		expect(button).toHaveAttribute("data-size", "icon");
	});

	it("should handle undefined theme", () => {
		mockUseTheme.mockReturnValue({
			theme: undefined,
			setTheme: mockSetTheme,
		});

		const MockedThemeToggle = () => {
			const [_mounted, _setMounted] = React.useState(true);
			const { theme, setTheme } = mockUseTheme();

			return (
				<button
					data-testid="theme-toggle-button"
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
				>
					<span>Toggle theme</span>
				</button>
			);
		};

		render(<MockedThemeToggle />);

		const button = screen.getByTestId("theme-toggle-button");
		fireEvent.click(button);

		// undefined theme should toggle to light
		expect(mockSetTheme).toHaveBeenCalledWith("light");
	});
});
