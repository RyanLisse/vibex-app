/**
 * Crypto Polyfill for JSDOM Test Environment
 * Provides complete Web Crypto API implementation for tests
 */

import { vi } from "vitest";

// Generate a random UUID v4
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Generate random values for arrays
const getRandomValues = (array: any) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
};

// Mock subtle crypto operations
const subtleCrypto = {
  encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
  decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
  sign: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  verify: vi.fn().mockResolvedValue(true),
  digest: vi.fn().mockImplementation((algorithm: string, data: ArrayBuffer) => {
    // Return different sizes based on algorithm
    const sizes = {
      "SHA-1": 20,
      "SHA-256": 32,
      "SHA-384": 48,
      "SHA-512": 64,
    };
    const size = sizes[algorithm as keyof typeof sizes] || 32;
    return Promise.resolve(new ArrayBuffer(size));
  }),
  generateKey: vi.fn().mockResolvedValue({
    privateKey: { type: "private", algorithm: "RSA-OAEP" },
    publicKey: { type: "public", algorithm: "RSA-OAEP" },
  }),
  importKey: vi.fn().mockResolvedValue({ 
    type: "secret", 
    algorithm: "AES-GCM",
    extractable: true,
    usages: ["encrypt", "decrypt"]
  }),
  exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  deriveBits: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  deriveKey: vi.fn().mockResolvedValue({ 
    type: "secret", 
    algorithm: "AES-GCM",
    extractable: true,
    usages: ["encrypt", "decrypt"]
  }),
  wrapKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  unwrapKey: vi.fn().mockResolvedValue({ 
    type: "secret", 
    algorithm: "AES-GCM",
    extractable: true,
    usages: ["encrypt", "decrypt"]
  }),
};

// Set up crypto polyfill
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      getRandomValues,
      randomUUID: generateUUID,
      subtle: subtleCrypto,
    },
    writable: true,
    configurable: true,
  });
}

// Also set it on global for Node.js compatibility
if (typeof global !== "undefined" && typeof global.crypto === "undefined") {
  Object.defineProperty(global, "crypto", {
    value: {
      getRandomValues,
      randomUUID: generateUUID,
      subtle: subtleCrypto,
    },
    writable: true,
    configurable: true,
  });
}

export { getRandomValues, generateUUID, subtleCrypto };