import { vi } from "vitest";

// Component test setup for jsdom environment
// For React components, hooks, and DOM-dependent tests

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	}),
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(),
	useParams: () => ({}),
}));

// Mock Next.js dynamic imports
vi.mock("next/dynamic", () => {
	return vi.fn((fn: any) => {
		return fn();
	});
});

// Mock Next.js font optimization
vi.mock("next/font/google", () => ({
	Geist: vi.fn(() => ({
		variable: "--font-geist-sans",
		subsets: ["latin"],
	})),
	Geist_Mono: vi.fn(() => ({
		variable: "--font-geist-mono",
		subsets: ["latin"],
	})),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
	ThemeProvider: ({ children, ...props }: any) => {
		const React = require("react");
		return React.createElement("div", { "data-testid": "theme-provider", ...props }, children);
	},
	useTheme: () => ({
		theme: "light",
		setTheme: vi.fn(),
		resolvedTheme: "light",
	}),
}));

// Mock CSS imports
vi.mock("app/streaming.css", () => ({}));
vi.mock("app/globals.css", () => ({}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
	observe: vi.fn(),
	disconnect: vi.fn(),
	unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
	observe: vi.fn(),
	disconnect: vi.fn(),
	unobserve: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock window.location
Object.defineProperty(window, "location", {
	writable: true,
	value: {
		href: "http://localhost:3000",
		origin: "http://localhost:3000",
		protocol: "http:",
		host: "localhost:3000",
		hostname: "localhost",
		port: "3000",
		pathname: "/",
		search: "",
		hash: "",
		assign: vi.fn(),
		replace: vi.fn(),
		reload: vi.fn(),
	},
});

// Mock environment variables for components
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_ENV = "test";

// Setup and cleanup for component tests
beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	document.body.innerHTML = "";
	vi.restoreAllMocks();
});
