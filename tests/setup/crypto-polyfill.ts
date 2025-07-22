/**
 * Crypto API polyfill for Bun test environment
 * Provides RFC 4122 compliant UUID v4 generation with fallbacks
 */

import { webcrypto } from "node:crypto";

interface CryptoPolyfill {
  randomUUID(): string;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  subtle: SubtleCrypto;
}

/**
 * Generate RFC 4122 compliant UUID v4
 * Uses secure random values for proper entropy
 */
function generateUUIDv4(): string {
  // Use Node.js crypto.webcrypto if available
  if (typeof webcrypto !== "undefined" && webcrypto.randomUUID) {
    return webcrypto.randomUUID();
  }

  // Fallback implementation using crypto.getRandomValues
  const array = new Uint8Array(16);
  
  // Use Node.js crypto for random values in Bun
  try {
    const nodeCrypto = require("node:crypto");
    nodeCrypto.randomFillSync(array);
  } catch {
    // Final fallback - use Math.random (less secure, test-only)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set version (4) and variant bits according to RFC 4122
  array[6] = (array[6] & 0x0f) | 0x40; // Version 4
  array[8] = (array[8] & 0x3f) | 0x80; // Variant 10

  // Convert to hex string with dashes
  const hex = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

/**
 * Polyfill for crypto.getRandomValues
 */
function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (!array) return array;
  
  try {
    const nodeCrypto = require("node:crypto");
    nodeCrypto.randomFillSync(array as ArrayBufferView);
    return array;
  } catch {
    // Fallback for test environment
    const view = new Uint8Array((array as ArrayBufferView).buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
}

/**
 * Mock SubtleCrypto for test environment
 */
const mockSubtleCrypto = {} as SubtleCrypto;

/**
 * Create crypto polyfill object
 */
const createCryptoPolyfill = (): CryptoPolyfill => ({
  randomUUID: generateUUIDv4,
  getRandomValues,
  subtle: mockSubtleCrypto,
});

/**
 * Install crypto polyfill globally
 */
export function installCryptoPolyfill(): void {
  // Check if crypto is already available and working
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    try {
      globalThis.crypto.randomUUID();
      return; // crypto.randomUUID already works
    } catch {
      // Falls through to install polyfill
    }
  }

  // Install the polyfill
  const cryptoPolyfill = createCryptoPolyfill();
  
  if (typeof globalThis.crypto === "undefined") {
    globalThis.crypto = cryptoPolyfill as Crypto;
  } else {
    // Extend existing crypto object
    Object.assign(globalThis.crypto, cryptoPolyfill);
  }
}

/**
 * Validate that crypto.randomUUID is working
 */
export function validateCryptoPolyfill(): boolean {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    // Validate UUID v4 format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof uuid === "string" && uuidRegex.test(uuid);
  } catch {
    return false;
  }
}

// Auto-install polyfill when module is imported
installCryptoPolyfill();

export default { installCryptoPolyfill, validateCryptoPolyfill, generateUUIDv4 };