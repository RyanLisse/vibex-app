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
	import { exists,
	import { inArray,
	import { isNotNull,
	import { isNull,
	import { sql,
} from "drizzle-orm";
	afterAll,
	beforeAll,
	import { beforeEach,
	import { describe,
	import { expect,
	import { it,
	import { vi,
} from "vitest";
import { migrationRunner } from "../../../db/migrations/migration-runner";
	agentExecutions,
	authSessions,
	environments,
	observabilityEvents,
	tasks,
	users,
} from "../../../db/schema";