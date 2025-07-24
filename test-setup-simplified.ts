/**
 * Simplified Global Test Setup
 * Uses consolidated test utilities to reduce duplication
 */

// CRITICAL: Import crypto polyfill FIRST to fix Bun crypto.randomUUID() issues
import "./tests/setup/crypto-polyfill";

import { testPresets } from "./lib/test-utils/consolidated-setup";

// Setup comprehensive test environment using consolidated utilities
const mocks = testPresets.component();

// Export mocks for use in individual tests if needed
export { mocks };
