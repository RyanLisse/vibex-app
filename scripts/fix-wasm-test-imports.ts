#!/usr/bin/env bun

import { promises as fs } from "fs";
import { join } from "path";

/**
 * Fix broken import statements in wasm test files
 */
async function fixWasmTestImports() {
	const wasmTestDir = join(process.cwd(), "tests/integration/wasm");
	const files = await fs.readdir(wasmTestDir);

	for (const file of files) {
		if (!file.endsWith(".test.ts")) continue;

		const filePath = join(wasmTestDir, file);
		let content = await fs.readFile(filePath, "utf-8");
		let modified = false;

		// Fix broken import patterns
		if (content.includes("	import { beforeEach,")) {
			content = content.replace(
				/\tafterAll,\n\tbeforeAll,\n\timport \{ beforeEach,\n\timport \{ describe,\n\timport \{ expect,\n\timport \{ it,\n\timport \{ vi\n\} from "vitest";/g,
				`import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest";`
			);
			modified = true;
		}

		if (content.includes("	import { afterEach,")) {
			content = content.replace(
				/\tafterEach,\n\tbeforeAll,\n\timport \{ beforeEach,\n\timport \{ describe,\n\timport \{ expect,\n\timport \{ it,\n\timport \{ vi\n\} from "vitest";/g,
				`import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest";`
			);
			modified = true;
		}

		// Fix import type patterns
		if (content.includes("	type AnalyticsData,")) {
			content = content.replace(
				/\} from "vitest";\n\ttype AnalyticsData,\n\ttype ComputeResult,\n\ttype ComputeTask,\nimport \{ ComputeWASM,/g,
				`} from "vitest";
import {
	type AnalyticsData,
	type ComputeResult,
	type ComputeTask,
	ComputeWASM,`
			);
			modified = true;
		}

		// Fix other import issues
		if (content.includes("				import { connectionId,")) {
			content = content.replace(
				/await createMockSQLiteUtils\(\)\.execute\(\n\t\t\t\t\t\t\t\timport \{ connectionId,\n\t\t\t\t\t\t\t\t`\nSELECT t1\.\*, t2\.name\s*\nFROM test_table t1\s*/g,
				`await createMockSQLiteUtils().execute(
								connectionId,
								\`
SELECT t1.*, t2.name 
FROM test_table t1 `
			);
			modified = true;
		}

		if (modified) {
			await fs.writeFile(filePath, content);
			console.log(`Fixed imports in ${file}`);
		}
	}
}

fixWasmTestImports().catch(console.error);