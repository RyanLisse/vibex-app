/**
 * Bun Test Setup with Mock Support
 *
 * This file sets up global mocks for Bun tests
 */

import { beforeAll } from "bun:test";

// Setup global jest object for compatibility
global.jest = {
	fn: (impl) => {
		const mockFn = (...args) => {
			return impl ? impl(...args) : undefined;
		};
		mockFn.mockImplementation = (newImpl) => {
			impl = newImpl;
			return mockFn;
		};
		mockFn.mockReturnValue = (value) => {
			impl = () => value;
			return mockFn;
		};
		mockFn.mockResolvedValue = (value) => {
			impl = () => Promise.resolve(value);
			return mockFn;
		};
		mockFn.mockRejectedValue = (value) => {
			impl = () => Promise.reject(value);
			return mockFn;
		};
		mockFn.mockClear = () => mockFn;
		mockFn.mockReset = () => mockFn;
		return mockFn;
	},

	spyOn: (obj, method) => {
		const original = obj[method];
		const spy = global.jest.fn(original);
		obj[method] = spy;
		return spy;
	},

	clearAllMocks: () => {},
	resetAllMocks: () => {},
	restoreAllMocks: () => {},

	mock: (moduleName, factory) => {
		// Store mock implementations
		if (!global.__mocks__) {
			global.__mocks__ = {};
		}
		if (factory) {
			global.__mocks__[moduleName] = factory();
		}
	},

	requireActual: (moduleName) => {
		return require(moduleName);
	},

	mocked: (fn) => fn,
};

// Setup module mocks before tests
beforeAll(() => {
	// Mock next/font/google
	Bun.plugin({
		name: "mock-next-font-google",
		setup(build) {
			build.module("next/font/google", () => {
				return {
					exports: {
						Inter: () => ({ className: "font-inter", style: { fontFamily: "Inter" } }),
						Roboto: () => ({ className: "font-roboto", style: { fontFamily: "Roboto" } }),
					},
				};
			});
		},
	});

	// Mock next/navigation
	Bun.plugin({
		name: "mock-next-navigation",
		setup(build) {
			build.module("next/navigation", () => {
				return {
					exports: {
						useRouter: () => ({
							push: global.jest.fn(),
							replace: global.jest.fn(),
							back: global.jest.fn(),
							pathname: "/",
							query: {},
						}),
						usePathname: () => "/",
						useSearchParams: () => new URLSearchParams(),
						useParams: () => ({}),
					},
				};
			});
		},
	});

	// Mock next/link
	Bun.plugin({
		name: "mock-next-link",
		setup(build) {
			build.module("next/link", () => {
				const React = require("react");
				return {
					exports: {
						default: ({ children, href, ...props }) =>
							React.createElement("a", { href, ...props }, children),
					},
				};
			});
		},
	});

	// Mock lucide-react
	Bun.plugin({
		name: "mock-lucide-react",
		setup(build) {
			build.module("lucide-react", () => {
				const React = require("react");
				const createIcon = (name) => {
					return ({ className, ...props }) =>
						React.createElement("svg", {
							className,
							"data-testid": `${name.toLowerCase()}-icon`,
							...props,
						});
				};

				return {
					exports: new Proxy(
						{},
						{
							get(target, prop) {
								if (typeof prop === "string" && prop[0] === prop[0].toUpperCase()) {
									return createIcon(prop);
								}
								return undefined;
							},
						}
					),
				};
			});
		},
	});

	// Mock CSS imports
	Bun.plugin({
		name: "mock-css",
		setup(build) {
			build.module(/\.(css|scss|sass)$/, () => {
				return { exports: {} };
			});
		},
	});
});
