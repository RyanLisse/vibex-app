/**
 * Migration CLI Test Suite
 *
 * Tests the command-line interface for migration operations,
 * including all commands, options, and error scenarios.
 */

import { join } from "path";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockedFunction,
	vi
} from "vitest";
