/**
 * Vitest Global Setup
 *
 * This file sets up the testing environment for Vitest tests,
 * particularly for React component testing with Testing Library.
 */

// Note: @testing-library/jest-dom was removed as part of Jest migration
// Using Vitest's built-in matchers instead
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

// Cleanup after each test to prevent memory leaks
afterEach(() => {
	cleanup();
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
