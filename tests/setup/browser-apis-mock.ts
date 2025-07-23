/**
 * Comprehensive Browser APIs Mock for JSDOM
 * Fixes all missing browser APIs that cause test failures
 */

import { vi } from "vitest";

// ResizeObserver Mock
export const mockResizeObserver = () => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
};

// IntersectionObserver Mock
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = vi.fn().mockImplementation((callback, options) => ({
    root: options?.root || null,
    rootMargin: options?.rootMargin || "0px",
    thresholds: options?.thresholds || [0],
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  }));
};

// MutationObserver Mock
export const mockMutationObserver = () => {
  global.MutationObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  }));
};

// PerformanceObserver Mock
export const mockPerformanceObserver = () => {
  global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  }));
};

// matchMedia Mock
export const mockMatchMedia = () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
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
};

// getComputedStyle Mock
export const mockGetComputedStyle = () => {
  Object.defineProperty(window, "getComputedStyle", {
    value: vi.fn().mockImplementation(() => ({
      getPropertyValue: vi.fn(() => ""),
      setProperty: vi.fn(),
      removeProperty: vi.fn(),
      length: 0,
      cssText: "",
      parentRule: null,
    })),
    writable: true,
    configurable: true,
  });
};

// requestAnimationFrame Mock
export const mockAnimationFrame = () => {
  global.requestAnimationFrame = vi.fn((callback) => {
    return setTimeout(() => callback(performance.now()), 16);
  });
  
  global.cancelAnimationFrame = vi.fn((id) => {
    clearTimeout(id);
  });
};

// requestIdleCallback Mock
export const mockIdleCallback = () => {
  global.requestIdleCallback = vi.fn((callback) => {
    return setTimeout(() => callback({
      didTimeout: false,
      timeRemaining: () => 50,
    }), 1);
  });
  
  global.cancelIdleCallback = vi.fn((id) => {
    clearTimeout(id);
  });
};

// WebSocket Mock
export const mockWebSocket = () => {
  global.WebSocket = vi.fn().mockImplementation((url, protocols) => ({
    url,
    protocols: protocols || [],
    readyState: 1, // OPEN
    bufferedAmount: 0,
    extensions: "",
    protocol: "",
    binaryType: "blob",
    
    // Constants
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
    
    // Methods
    close: vi.fn(),
    send: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    
    // Event handlers
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
  }));
};

// MediaDevices Mock
export const mockMediaDevices = () => {
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [
          { 
            stop: vi.fn(), 
            kind: "audio", 
            enabled: true,
            muted: false,
            readyState: "live",
            id: "audio-track-1",
            label: "Default Audio",
          }
        ],
        getAudioTracks: () => [
          { 
            stop: vi.fn(), 
            kind: "audio", 
            enabled: true,
            muted: false,
            readyState: "live",
            id: "audio-track-1",
            label: "Default Audio",
          }
        ],
        getVideoTracks: () => [],
        stop: vi.fn(),
        active: true,
        id: "media-stream-1",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      
      enumerateDevices: vi.fn().mockResolvedValue([
        {
          deviceId: "default",
          kind: "audioinput",
          label: "Default Audio Input",
          groupId: "group-1",
        },
        {
          deviceId: "communications",
          kind: "audiooutput", 
          label: "Default Audio Output",
          groupId: "group-1",
        }
      ]),
      
      getDisplayMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ 
          stop: vi.fn(), 
          kind: "video",
          enabled: true,
          muted: false,
          readyState: "live",
        }],
        active: true,
        id: "display-stream-1",
      }),
      
      getSupportedConstraints: vi.fn(() => ({
        width: true,
        height: true,
        aspectRatio: true,
        frameRate: true,
        facingMode: true,
        volume: true,
        sampleRate: true,
        sampleSize: true,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true,
        latency: true,
        channelCount: true,
        deviceId: true,
        groupId: true,
      })),
    },
    writable: true,
    configurable: true,
  });
};

// Geolocation Mock
export const mockGeolocation = () => {
  Object.defineProperty(navigator, "geolocation", {
    value: {
      getCurrentPosition: vi.fn((success, error, options) => {
        success({
          coords: {
            latitude: 51.505,
            longitude: -0.09,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
      }),
      
      watchPosition: vi.fn((success, error, options) => {
        success({
          coords: {
            latitude: 51.505,
            longitude: -0.09,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        });
        return 1; // watch id
      }),
      
      clearWatch: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
};

// Clipboard Mock
export const mockClipboard = () => {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue("test text"),
      write: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue([]),
    },
    writable: true,
    configurable: true,
  });
};

// Apply all mocks
export const setupBrowserAPIs = () => {
  mockResizeObserver();
  mockIntersectionObserver();
  mockMutationObserver();
  mockPerformanceObserver();
  mockMatchMedia();
  mockGetComputedStyle();
  mockAnimationFrame();
  mockIdleCallback();
  mockWebSocket();
  mockMediaDevices();
  mockGeolocation();
  mockClipboard();
};

// Auto-setup when imported
setupBrowserAPIs();