#!/usr/bin/env bun

import { promises as fs } from "fs";
import path from "path";

interface TestFix {
	file: string;
	pattern: RegExp;
	replacement: string;
	description: string;
}

const fixes: TestFix[] = [
	// Fix skipIf patterns
	{
		file: "tests/integration/performance/performance-monitoring.test.ts",
		pattern: /describe\.skipIf\(skipTests\)/g,
		replacement: "describe",
		description: "Enable performance monitoring tests",
	},
	{
		file: "tests/integration/database/migration-system.test.ts",
		pattern: /describe\.skipIf\(skipTests\)/g,
		replacement: "describe",
		description: "Enable migration system tests",
	},
	{
		file: "tests/integration/database/database-operations.test.ts",
		pattern: /describe\.skipIf\(skipTests\)/g,
		replacement: "describe",
		description: "Enable database operations tests",
	},
	{
		file: "tests/integration/database/data-integrity.test.ts",
		pattern: /describe\.skipIf\(skipTests\)/g,
		replacement: "describe",
		description: "Enable data integrity tests",
	},
	{
		file: "db/schema.test.ts",
		pattern: /describe\.skipIf\(skipTests\)/g,
		replacement: "describe",
		description: "Enable schema tests",
	},
	// Fix electric sync tests
	{
		file: "tests/integration/electric/electric-sync.test.ts",
		pattern: /describe\.skip\(/g,
		replacement: "describe(",
		description: "Enable electric sync describe block",
	},
	{
		file: "tests/integration/electric/electric-sync.test.ts",
		pattern: /it\.skip\(/g,
		replacement: "it(",
		description: "Enable individual electric sync tests",
	},
];

async function fixTestFile(fix: TestFix) {

	try {
		const filePath = path.join(process.cwd(), fix.file);
		const content = await fs.readFile(filePath, "utf-8");

		if (content.match(fix.pattern)) {
			const updatedContent = content.replace(fix.pattern, fix.replacement);
			await fs.writeFile(filePath, updatedContent, "utf-8");
			console.log(`✓ Fixed: ${fix.description} in ${fix.file}`);
			return true;
		}

		console.log(`- No changes needed: ${fix.file}`);
		return false;
	} catch (error) {
		console.error(`✗ Error fixing ${fix.file}:`, error);
		return false;
	}

}

async function createTestEnvironmentFile() {
	const envContent = `# Test Environment Configuration
NODE_ENV=test

# Database
DATABASE_URL=file::memory:?cache=shared

# Electric SQL
ELECTRIC_URL=http://localhost:5133
ELECTRIC_WEBSOCKET_URL=ws://localhost:5133
ELECTRIC_AUTH_TOKEN=test_auth_token
ELECTRIC_USER_ID=test_user_id
ELECTRIC_API_KEY=test_api_key

# Auth
AUTH_SECRET=test_auth_secret_for_testing_only
NEXTAUTH_URL=http://localhost:3000

# Inngest
INNGEST_SIGNING_KEY=test-signing-key
INNGEST_EVENT_KEY=test-event-key

# Redis/Valkey
REDIS_URL=redis://localhost:6379
VALKEY_URL=redis://localhost:6379

# Monitoring
OTEL_ENABLED=false
`;

	const envPath = path.join(process.cwd(), ".env.test");
	await fs.writeFile(envPath, envContent, "utf-8");
	console.log("✓ Created .env.test file");
}

async function updatePackageJsonScripts() {

	const packageJsonPath = path.join(process.cwd(), "package.json");
	const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));

	// Update test scripts for better organization
	const updatedScripts = {
		...packageJson.scripts,
		test: "vitest run",
		"test:watch": "vitest",
		"test:ui": "vitest --ui",
		"test:coverage": "vitest run --coverage",
		"test:unit": "vitest run --project=unit",
		"test:components": "vitest run --project=components",
		"test:integration": "vitest run --project=integration",
		"test:browser": "vitest run --project=browser",
		"test:all": "vitest run --workspace",
		"test:all:watch": "vitest --workspace",
		"test:ci": "CI=true vitest run --workspace --coverage",
	};

	packageJson.scripts = updatedScripts;

	await fs.writeFile(
		packageJsonPath,
		JSON.stringify(packageJson, null, 2) + "\n",
		"utf-8",
	);

	console.log("✓ Updated package.json test scripts");

}

async function createGlobalTestSetup() {
	const setupContent = `import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { config } from 'dotenv'

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') })

// Global test hooks
beforeAll(() => {
  console.log('🧪 Starting test suite...')
})

afterAll(() => {
  console.log('✅ Test suite completed')
})

beforeEach(() => {
  // Reset any global state if needed
})

afterEach(() => {
  // Cleanup after each test
})

// Increase test timeout for CI environments
if (process.env.CI) {
  beforeAll(() => {
    vi.setConfig({ testTimeout: 30000 })
  })
}
`;

	const setupPath = path.join(process.cwd(), "tests/setup/global.ts");
	await fs.writeFile(setupPath, setupContent, "utf-8");
	console.log("✓ Created global test setup");
}

async function main() {

	console.log("🔧 Fixing test framework configuration...\n");

	let fixedCount = 0;

	// Fix skipped tests
	for (const fix of fixes) {
		if (await fixTestFile(fix)) {
			fixedCount++;
		}
	}

	// Create test environment file
	await createTestEnvironmentFile();

	// Update package.json scripts
	await updatePackageJsonScripts();

	// Create global test setup
	await createGlobalTestSetup();

	console.log("\n✨ Test framework fixes completed!");
	console.log(`   - Fixed ${fixedCount} test files`);
	console.log("   - Created .env.test");
	console.log("   - Updated package.json scripts");
	console.log("   - Created global test setup");
	console.log('\nRun "bun run test:all" to execute all tests');
}

main().catch((error) => {
	console.error("Failed to fix test framework:", error);
	process.exit(1);
});

