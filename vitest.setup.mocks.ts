/**
 * Vitest Mock Setup
 *
 * This file configures all necessary mocks for running tests with Vitest
 */

import React from "react";
import { vi } from "vitest";

// Ensure global jest compatibility
global.jest = vi;

// Mock next/font/google before any imports
vi.mock("next/font/google", () => ({
	Inter: vi.fn(() => ({
		className: "font-inter",
		style: { fontFamily: "Inter" },
		variable: "--font-inter",
	})),
	Roboto: vi.fn(() => ({
		className: "font-roboto",
		style: { fontFamily: "Roboto" },
		variable: "--font-roboto",
	})),
	Roboto_Mono: vi.fn(() => ({
		className: "font-roboto-mono",
		style: { fontFamily: "Roboto Mono" },
		variable: "--font-roboto-mono",
	})),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(() => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		pathname: "/",
		query: {},
		asPath: "/",
	})),
	usePathname: vi.fn(() => "/"),
	useSearchParams: vi.fn(() => new URLSearchParams()),
	useParams: vi.fn(() => ({})),
	redirect: vi.fn(),
	notFound: vi.fn(),
	useSelectedLayoutSegment: vi.fn(),
	useSelectedLayoutSegments: vi.fn(() => []),
}));

// Mock next/link
vi.mock("next/link", () => ({
	__esModule: true,
	default: vi.fn(
		({
			children,
			href,
			...props
		}: {
			children: React.ReactNode;
			href: string;
			[key: string]: unknown;
		}) => React.createElement("a", { href, ...props }, children)
	),
}));

// Mock lucide-react
vi.mock("lucide-react", () => {
	const createIcon = (name: string) => {
		const component = ({ className, ...props }: { className?: string; [key: string]: unknown }) =>
			React.createElement("svg", {
				className,
				"data-testid": `${name.toLowerCase()}-icon`,
				...props,
			});
		component.displayName = name;
		return vi.fn(component);
	};

	return new Proxy(
		{},
		{
			get(_target, prop: string) {
				if (typeof prop === "string" && prop[0] === prop[0].toUpperCase()) {
					return createIcon(prop);
				}
				return undefined;
			},
		}
	);
});

// Mock next-themes
vi.mock("next-themes", () => ({
	useTheme: vi.fn(() => ({
		theme: "light",
		setTheme: vi.fn(),
		resolvedTheme: "light",
		themes: ["light", "dark"],
		systemTheme: "light",
	})),
	ThemeProvider: vi.fn(({ children }) => children),
}));

// Mock all Radix UI components
const mockRadixComponent = (name: string, props: Record<string, unknown> = {}) =>
	vi.fn(({ children, ...otherProps }: { children?: React.ReactNode; [key: string]: unknown }) =>
		React.createElement("div", { "data-testid": name, ...props, ...otherProps }, children)
	);

vi.mock("@radix-ui/react-dialog", () => ({
	Root: mockRadixComponent("dialog-root"),
	Trigger: mockRadixComponent("dialog-trigger"),
	Portal: vi.fn(({ children }) => children),
	Overlay: mockRadixComponent("dialog-overlay"),
	Content: mockRadixComponent("dialog-content"),
	Title: mockRadixComponent("dialog-title"),
	Description: mockRadixComponent("dialog-description"),
	Close: mockRadixComponent("dialog-close"),
}));

vi.mock("@radix-ui/react-label", () => ({
	Root: vi.fn(
		({
			children,
			className,
			...props
		}: {
			children?: React.ReactNode;
			className?: string;
			[key: string]: unknown;
		}) =>
			React.createElement("label", { className, "data-testid": "label-root", ...props }, children)
	),
}));

vi.mock("@radix-ui/react-select", () => ({
	Root: mockRadixComponent("select-root"),
	Trigger: mockRadixComponent("select-trigger"),
	Value: mockRadixComponent("select-value"),
	Icon: mockRadixComponent("select-icon"),
	Portal: vi.fn(({ children }) => children),
	Content: mockRadixComponent("select-content"),
	Item: mockRadixComponent("select-item"),
	ItemText: vi.fn(({ children }) => children),
	ItemIndicator: mockRadixComponent("select-item-indicator"),
	Group: mockRadixComponent("select-group"),
	Label: mockRadixComponent("select-label"),
	Separator: mockRadixComponent("select-separator"),
	ScrollUpButton: mockRadixComponent("select-scroll-up"),
	ScrollDownButton: mockRadixComponent("select-scroll-down"),
	Viewport: mockRadixComponent("select-viewport"),
}));

vi.mock("@radix-ui/react-separator", () => ({
	Root: mockRadixComponent("separator-root"),
}));

vi.mock("@radix-ui/react-scroll-area", () => ({
	Root: mockRadixComponent("scroll-area-root-primitive"),
	Viewport: mockRadixComponent("scroll-area-viewport-primitive"),
	ScrollAreaScrollbar: mockRadixComponent("scroll-area-scrollbar-primitive"),
	ScrollAreaThumb: mockRadixComponent("scroll-area-thumb-primitive"),
	ScrollAreaCorner: mockRadixComponent("scroll-area-corner-primitive"),
}));

vi.mock("@radix-ui/react-tabs", () => ({
	Root: mockRadixComponent("tabs-root-primitive"),
	List: mockRadixComponent("tabs-list-primitive", { role: "tablist" }),
	Trigger: mockRadixComponent("tabs-trigger-primitive", { role: "tab" }),
	Content: mockRadixComponent("tabs-content-primitive", { role: "tabpanel" }),
}));

vi.mock("@radix-ui/react-tooltip", () => ({
	Provider: vi.fn(({ children }) => children),
	Root: mockRadixComponent("tooltip-root"),
	Trigger: mockRadixComponent("tooltip-trigger"),
	Portal: vi.fn(({ children }) => children),
	Content: mockRadixComponent("tooltip-content"),
	Arrow: mockRadixComponent("tooltip-arrow"),
}));

// Mock CSS imports
vi.mock("*.css", () => ({}));
vi.mock("*.scss", () => ({}));
vi.mock("*.sass", () => ({}));

// Mock static assets
vi.mock("*.png", () => "test-file-stub");
vi.mock("*.jpg", () => "test-file-stub");
vi.mock("*.jpeg", () => "test-file-stub");
vi.mock("*.gif", () => "test-file-stub");
vi.mock("*.svg", () => "test-file-stub");

// Export for use in tests
export { vi, React };
