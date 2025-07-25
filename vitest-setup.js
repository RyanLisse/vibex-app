/**
 * Vitest Global Setup
 *
 * This file sets up the testing environment for Vitest tests,
 * particularly for React component testing with Testing Library.
 */

// Note: @testing-library/jest-dom was removed as part of Jest migration
// Using Vitest's built-in matchers instead
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";

// Try to import jest-dom matchers if available
try {
	const matchers = require("@testing-library/jest-dom/matchers");
	expect.extend(matchers);
} catch (e) {
	// If jest-dom is not available, add minimal implementations
	expect.extend({
		toBeInTheDocument(received) {
			if (received == null) {
				return {
					pass: false,
					message: () => "expected element to be in the document",
				};
			}
			return {
				pass: true,
				message: () => "expected element not to be in the document",
			};
		},
		toHaveTextContent(received, expected) {
			const pass = received?.textContent?.includes(expected);
			return {
				pass,
				message: () =>
					pass
						? `expected element not to have text content ${expected}`
						: `expected element to have text content ${expected}`,
			};
		},
		toBeVisible(received) {
			const pass = received && !received.hidden;
			return {
				pass,
				message: () =>
					pass ? "expected element not to be visible" : "expected element to be visible",
			};
		},
		toHaveAttribute(received, attr, value) {
			const hasAttr = received?.hasAttribute?.(attr);
			const attrValue = received?.getAttribute?.(attr);
			const pass = value !== undefined ? attrValue === value : hasAttr;
			return {
				pass,
				message: () =>
					pass
						? `expected element not to have attribute ${attr}`
						: `expected element to have attribute ${attr}`,
			};
		},
	});
}

// Cleanup after each test to prevent memory leaks
afterEach(() => {
	cleanup();
});

// Setup browser environment mocks
function setupBrowserMocks() {
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
			reload: vi.fn(),
			replace: vi.fn(),
			assign: vi.fn(),
			toString: vi.fn(() => "http://localhost:3000"),
		},
	});

	// Mock window.matchMedia
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(), // deprecated
			removeListener: vi.fn(), // deprecated
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});

	// Mock IntersectionObserver
	global.IntersectionObserver = vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	}));

	// Mock ResizeObserver
	global.ResizeObserver = vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		unobserve: vi.fn(),
		disconnect: vi.fn(),
	}));

	// Mock scrollTo
	window.scrollTo = vi.fn();

	// Mock navigator.mediaDevices for screenshot and voice functionality
	Object.defineProperty(navigator, "mediaDevices", {
		writable: true,
		value: {
			getUserMedia: vi.fn().mockResolvedValue({
				getTracks: () => [{ stop: vi.fn() }],
				getVideoTracks: () => [{ stop: vi.fn() }],
				getAudioTracks: () => [{ stop: vi.fn() }],
			}),
			getDisplayMedia: vi.fn().mockResolvedValue({
				getTracks: () => [{ stop: vi.fn() }],
				getVideoTracks: () => [{ stop: vi.fn() }],
				getAudioTracks: () => [{ stop: vi.fn() }],
			}),
			enumerateDevices: vi.fn().mockResolvedValue([]),
		},
	});

	// Mock navigator.clipboard
	Object.defineProperty(navigator, "clipboard", {
		writable: true,
		value: {
			writeText: vi.fn().mockResolvedValue(undefined),
			readText: vi.fn().mockResolvedValue(""),
			write: vi.fn().mockResolvedValue(undefined),
			read: vi.fn().mockResolvedValue([]),
		},
	});

	// Mock SpeechRecognition for voice input
	global.SpeechRecognition = vi.fn().mockImplementation(() => ({
		start: vi.fn(),
		stop: vi.fn(),
		abort: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		continuous: false,
		interimResults: false,
		lang: "en-US",
		maxAlternatives: 1,
		serviceURI: "",
		grammars: null,
	}));

	global.webkitSpeechRecognition = global.SpeechRecognition;

	// Mock WebSocket for real-time updates
	global.WebSocket = vi.fn().mockImplementation(() => ({
		send: vi.fn(),
		close: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		readyState: 1, // OPEN
		CONNECTING: 0,
		OPEN: 1,
		CLOSING: 2,
		CLOSED: 3,
	}));

	// Mock HTMLCanvasElement and CanvasRenderingContext2D for image annotation
	if (typeof HTMLCanvasElement !== "undefined") {
		HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
			fillRect: vi.fn(),
			clearRect: vi.fn(),
			getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
			putImageData: vi.fn(),
			createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
			setTransform: vi.fn(),
			drawImage: vi.fn(),
			save: vi.fn(),
			fillText: vi.fn(),
			restore: vi.fn(),
			beginPath: vi.fn(),
			moveTo: vi.fn(),
			lineTo: vi.fn(),
			closePath: vi.fn(),
			stroke: vi.fn(),
			translate: vi.fn(),
			scale: vi.fn(),
			rotate: vi.fn(),
			arc: vi.fn(),
			fill: vi.fn(),
			measureText: vi.fn(() => ({ width: 0 })),
			transform: vi.fn(),
			rect: vi.fn(),
			clip: vi.fn(),
		});

		HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,test");
		HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
			callback(new Blob(["test"], { type: "image/png" }));
		});
	}

	// Mock localStorage
	const localStorageMock = {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		length: 0,
		key: vi.fn(),
	};
	Object.defineProperty(window, "localStorage", {
		value: localStorageMock,
		writable: true,
	});

	// Mock sessionStorage
	const sessionStorageMock = {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
		length: 0,
		key: vi.fn(),
	};
	Object.defineProperty(window, "sessionStorage", {
		value: sessionStorageMock,
		writable: true,
	});

	// Suppress console errors in tests (optional - remove if you want to see errors)
	const originalError = console.error;
	beforeAll(() => {
		console.error = (...args) => {
			// Ignore React act() warnings
			if (args[0]?.includes?.("Warning: ReactDOMTestUtils.act")) {
				return;
			}
			// Ignore known React warnings
			if (args[0]?.includes?.("Warning: React does not recognize")) {
				return;
			}
			originalError.call(console, ...args);
		};
	});

	afterAll(() => {
		console.error = originalError;
	});

	// Mock FileReader for Node environment tests
	global.FileReader = vi.fn().mockImplementation(() => {
		const fileReader = {
			readAsDataURL: vi.fn((blob) => {
				// Simulate async behavior
				setTimeout(() => {
					fileReader.result = "data:audio/webm;base64,dGVzdCBkYXRh";
					if (fileReader.onloadend) fileReader.onloadend();
				}, 0);
			}),
			readAsText: vi.fn((blob) => {
				setTimeout(() => {
					fileReader.result = "test text content";
					if (fileReader.onloadend) fileReader.onloadend();
				}, 0);
			}),
			readAsArrayBuffer: vi.fn((blob) => {
				setTimeout(() => {
					fileReader.result = new ArrayBuffer(8);
					if (fileReader.onloadend) fileReader.onloadend();
				}, 0);
			}),
			readAsBinaryString: vi.fn((blob) => {
				setTimeout(() => {
					fileReader.result = "binary string";
					if (fileReader.onloadend) fileReader.onloadend();
				}, 0);
			}),
			onloadend: null,
			onerror: null,
			onload: null,
			onprogress: null,
			onloadstart: null,
			onabort: null,
			result: null,
			error: null,
			readyState: 0,
			abort: vi.fn(),
			EMPTY: 0,
			LOADING: 1,
			DONE: 2,
		};
		return fileReader;
	});

	// Mock MutationObserver
	global.MutationObserver = vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		disconnect: vi.fn(),
		takeRecords: vi.fn(() => []),
	}));

	// Mock URL constructor
	global.URL =
		URL ||
		vi.fn().mockImplementation((url, base) => {
			const urlObj = new (require("url").URL)(url, base);
			return urlObj;
		});

	// Mock Blob constructor if not available
	if (!global.Blob) {
		global.Blob = vi.fn().mockImplementation((parts, options) => ({
			size: parts ? parts.reduce((acc, part) => acc + part.length, 0) : 0,
			type: options?.type || "",
			slice: vi.fn(),
			stream: vi.fn(),
			text: vi.fn().mockResolvedValue(parts ? parts.join("") : ""),
			arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		}));
	}

	// Mock File constructor if not available
	if (!global.File) {
		global.File = vi.fn().mockImplementation((bits, name, options) => ({
			...new Blob(bits, options),
			name: name,
			lastModified: options?.lastModified || Date.now(),
			webkitRelativePath: "",
		}));
	}

	// Mock Performance API
	if (!global.performance) {
		global.performance = {
			now: vi.fn(() => Date.now()),
			mark: vi.fn(),
			measure: vi.fn(),
			clearMarks: vi.fn(),
			clearMeasures: vi.fn(),
			getEntriesByName: vi.fn(() => []),
			getEntriesByType: vi.fn(() => []),
			timeOrigin: Date.now(),
		};
	}

	// Mock requestAnimationFrame and cancelAnimationFrame
	global.requestAnimationFrame = vi.fn((callback) => {
		return setTimeout(callback, 16); // ~60fps
	});
	global.cancelAnimationFrame = vi.fn((id) => {
		clearTimeout(id);
	});

	// Mock requestIdleCallback and cancelIdleCallback
	global.requestIdleCallback = vi.fn((callback) => {
		const start = Date.now();
		return setTimeout(() => {
			callback({
				didTimeout: false,
				timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
			});
		}, 1);
	});
	global.cancelIdleCallback = vi.fn((id) => {
		clearTimeout(id);
	});

	// Mock Image constructor
	global.Image = vi.fn().mockImplementation(() => ({
		src: "",
		alt: "",
		width: 0,
		height: 0,
		onload: null,
		onerror: null,
		onabort: null,
		decode: vi.fn().mockResolvedValue(undefined),
		complete: false,
		naturalWidth: 0,
		naturalHeight: 0,
	}));

	// Mock MediaRecorder
	global.MediaRecorder = vi.fn().mockImplementation(() => ({
		start: vi.fn(),
		stop: vi.fn(),
		pause: vi.fn(),
		resume: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		ondataavailable: null,
		onstop: null,
		onstart: null,
		onerror: null,
		state: "inactive",
		stream: null,
		mimeType: "",
		videoBitsPerSecond: 0,
		audioBitsPerSecond: 0,
	}));

	// Mock PerformanceObserver
	global.PerformanceObserver = vi.fn().mockImplementation(() => ({
		observe: vi.fn(),
		disconnect: vi.fn(),
		takeRecords: vi.fn(() => []),
	}));

	// Mock getComputedStyle
	window.getComputedStyle = vi.fn().mockImplementation(() => ({
		getPropertyValue: vi.fn().mockReturnValue(""),
		cssText: "",
		length: 0,
		parentRule: null,
	}));

	// Mock createObjectURL and revokeObjectURL
	window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
	window.URL.revokeObjectURL = vi.fn();
}

// Call setup if window is available
if (typeof window !== "undefined") {
	setupBrowserMocks();
}

// Mock crypto.getRandomValues
if (!global.crypto) {
	global.crypto = {};
}
global.crypto.getRandomValues = vi.fn((array) => {
	for (let i = 0; i < array.length; i++) {
		array[i] = Math.floor(Math.random() * 256);
	}
	return array;
});

// Mock structuredClone
global.structuredClone = vi.fn((obj) => JSON.parse(JSON.stringify(obj)));
