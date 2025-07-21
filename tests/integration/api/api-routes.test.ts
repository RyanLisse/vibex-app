/**
 * API Routes Integration Tests
 *
 * Comprehensive test suite for all API endpoints including authentication,
 * error handling, data validation, rate limiting, and performance
 */

import type { AddressInfo } from "net";
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest";