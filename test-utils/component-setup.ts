/**
 * Component Test Setup
 *
 * Additional setup specific to component testing
 */
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach } from "vitest";

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		pathname: "/",
		query: {},
	}),
	useSearchParams: () => ({
		get: vi.fn(),
		getAll: vi.fn(),
		has: vi.fn(),
		keys: vi.fn(),
		values: vi.fn(),
		entries: vi.fn(),
		forEach: vi.fn(),
		toString: vi.fn(),
	}),
	usePathname: () => "/",
	useParams: () => ({}),
	notFound: vi.fn(),
	redirect: vi.fn(),
}));

// Mock next/image
vi.mock("next/image", () => ({
	default: vi.fn((props: any) => {
		return React.createElement("img", {
			src: props.src,
			alt: props.alt,
			...props,
		});
	}),
}));

// Mock framer-motion for tests
vi.mock("framer-motion", async () => {
	const actual = await vi.importActual("framer-motion");
	const createMockComponent = (element: string) => {
		return vi.fn(({ children, ...props }: any) => React.createElement(element, props, children));
	};

	return {
		...actual,
		AnimatePresence: vi.fn(({ children }: any) => children),
		motion: {
			div: createMockComponent("div"),
			span: createMockComponent("span"),
			button: createMockComponent("button"),
			li: createMockComponent("li"),
			ul: createMockComponent("ul"),
			p: createMockComponent("p"),
			h1: createMockComponent("h1"),
			h2: createMockComponent("h2"),
			h3: createMockComponent("h3"),
			h4: createMockComponent("h4"),
			h5: createMockComponent("h5"),
			h6: createMockComponent("h6"),
			section: createMockComponent("section"),
			article: createMockComponent("article"),
			nav: createMockComponent("nav"),
			aside: createMockComponent("aside"),
			header: createMockComponent("header"),
			footer: createMockComponent("footer"),
			main: createMockComponent("main"),
			form: createMockComponent("form"),
			input: createMockComponent("input"),
			textarea: createMockComponent("textarea"),
			select: createMockComponent("select"),
			a: createMockComponent("a"),
		},
	};
});

// Setup CSS modules
globalThis.CSS = {
	supports: () => false,
	escape: (str: string) => str,
} as any;
