/**
 * Data Integrity Validation Tests
 *
 * Comprehensive test suite for data integrity including concurrent operations,
 * constraint enforcement, referential integrity, transaction isolation, and
 * consistency validation across the entire database schema.
 */

	and,
	count,
	eq,
	exists,
	inArray,
	isNotNull,
	isNull,
	sql,
} from "drizzle-orm";
import {
afterAll,
beforeAll,
	beforeEach,
	describe,
	expect,
	it,
import {
import {
	vi
} from "vitest";
import { migrationRunner } from "../../../db/migrations/migration-runner";
import {
agentExecutions,
authSessions,
environments,
	observabilityEvents,
		tasks,
	users,
} from "../../../db/schema";