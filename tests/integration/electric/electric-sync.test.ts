/**
 * ElectricSQL Synchronization Integration Tests
 *
 * Comprehensive test suite for ElectricSQL real-time sync, conflict resolution,
 * offline/online transitions, and subscription management
 */

import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest";
import { NewAgentExecution,
import { NewTask
} from "../../../db/schema";
	type ElectricDatabaseManager,
	electricDb,
} from "../../../lib/electric/config";