#!/usr/bin/env bun

/**
 * Basic Migration Test Script
 *
 * Tests the core migration functionality without Redis dependency
 * to verify the basic data transformation and database operations work.
 */

import { eq } from "drizzle-orm";
import { db } from "../db/config";
import { environments, tasks } from "../db/schema";

// Sample test data
const sampleTask = {
	id: "test-task-1",
	title: "Test Migration Task",
	description: "A sample task for testing migration",
	messages: [
		{
			role: "user" as const,
			type: "text",
			data: { content: "Create a new feature" },
		},
	],
	status: "IN_PROGRESS" as const,
	branch: "feature/test-migration",
	sessionId: "session-123",
	repository: "test-repo",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	isArchived: false,
	mode: "code" as const,
	hasChanges: true,
};

const sampleEnvironment = {
	id: "test-env-1",
	name: "Test Environment",
	description: "A test environment for migration testing",
	githubOrganization: "test-org",
	githubToken: "ghp_test_token",
	githubRepository: "test-repo",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

// Colors for console output
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
};

function colorize(text: string, color: keyof typeof colors): string {
	return `${colors[color]}${text}${colors.reset}`;
}

function logInfo(message: string): void {
	console.log(`${colorize("ℹ", "blue")} ${message}`);
}

function logSuccess(message: string): void {
	console.log(`${colorize("✓", "green")} ${message}`);
}

function logError(message: string): void {
	console.log(`${colorize("✗", "red")} ${message}`);
}

/**
 * Test database connection
 */
async function testDatabaseConnection(): Promise<boolean> {
	logInfo("Testing database connection...");

	try {
		// Simple query to test connection
		const result = await db.select().from(tasks).limit(1);
		logSuccess("Database connection successful");
		return true;
	} catch (error) {
		logError(
			`Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}

/**
 * Test task insertion
 */
async function testTaskInsertion(): Promise<boolean> {
	logInfo("Testing task insertion...");

	try {
		// Transform sample task to database format
		const dbTask = {
			id: sampleTask.id,
			title: sampleTask.title,
			description: sampleTask.description,
			status: sampleTask.status,
			branch: sampleTask.branch,
			sessionId: sampleTask.sessionId,
			repository: sampleTask.repository,
			createdAt: new Date(sampleTask.createdAt),
			updatedAt: new Date(sampleTask.updatedAt),
			userId: "test-user-123",
			metadata: {
				mode: sampleTask.mode,
				isArchived: sampleTask.isArchived,
				hasChanges: sampleTask.hasChanges,
				messages: sampleTask.messages,
			},
		};

		// Insert task
		await db.insert(tasks).values(dbTask).onConflictDoNothing();

		// Verify insertion
		const inserted = await db
			.select()
			.from(tasks)
			.where(eq(tasks.id, sampleTask.id))
			.limit(1);

		if (inserted.length === 0) {
			logError("Task insertion failed - no record found");
			return false;
		}

		logSuccess(`Task inserted successfully: ${inserted[0].title}`);
		return true;
	} catch (error) {
		logError(
			`Task insertion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}

/**
 * Test environment insertion
 */
async function testEnvironmentInsertion(): Promise<boolean> {
	logInfo("Testing environment insertion...");

	try {
		// Transform sample environment to database format
		const dbEnvironment = {
			id: sampleEnvironment.id,
			name: sampleEnvironment.name,
			description: sampleEnvironment.description,
			githubOrganization: sampleEnvironment.githubOrganization,
			githubToken: sampleEnvironment.githubToken,
			githubRepository: sampleEnvironment.githubRepository,
			createdAt: new Date(sampleEnvironment.createdAt),
			updatedAt: new Date(sampleEnvironment.updatedAt),
			userId: "test-user-123",
		};

		// Insert environment
		await db.insert(environments).values(dbEnvironment).onConflictDoNothing();

		// Verify insertion
		const inserted = await db
			.select()
			.from(environments)
			.where(eq(environments.id, sampleEnvironment.id))
			.limit(1);

		if (inserted.length === 0) {
			logError("Environment insertion failed - no record found");
			return false;
		}

		logSuccess(`Environment inserted successfully: ${inserted[0].name}`);
		return true;
	} catch (error) {
		logError(
			`Environment insertion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}

/**
 * Test data retrieval
 */
async function testDataRetrieval(): Promise<boolean> {
	logInfo("Testing data retrieval...");

	try {
		// Get all tasks
		const allTasks = await db.select().from(tasks);
		logInfo(`Found ${allTasks.length} tasks in database`);

		// Get all environments
		const allEnvironments = await db.select().from(environments);
		logInfo(`Found ${allEnvironments.length} environments in database`);

		logSuccess("Data retrieval successful");
		return true;
	} catch (error) {
		logError(
			`Data retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return false;
	}
}

/**
 * Cleanup test data
 */
async function cleanupTestData(): Promise<void> {
	logInfo("Cleaning up test data...");

	try {
		await db.delete(tasks).where(eq(tasks.id, sampleTask.id));
		await db
			.delete(environments)
			.where(eq(environments.id, sampleEnvironment.id));
		logSuccess("Test data cleaned up");
	} catch (error) {
		logError(
			`Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Main test function
 */
async function runBasicTests(): Promise<void> {
	console.log(colorize("\n=== Basic Migration System Test ===", "bright"));

	let allTestsPassed = true;

	try {
		// Test database connection
		const dbConnected = await testDatabaseConnection();
		allTestsPassed = allTestsPassed && dbConnected;

		if (!dbConnected) {
			logError("Database connection failed, skipping other tests");
			return;
		}

		// Test task insertion
		const taskInserted = await testTaskInsertion();
		allTestsPassed = allTestsPassed && taskInserted;

		// Test environment insertion
		const envInserted = await testEnvironmentInsertion();
		allTestsPassed = allTestsPassed && envInserted;

		// Test data retrieval
		const dataRetrieved = await testDataRetrieval();
		allTestsPassed = allTestsPassed && dataRetrieved;

		// Cleanup
		await cleanupTestData();

		console.log("\n" + colorize("=== Test Results ===", "bright"));
		if (allTestsPassed) {
			logSuccess(
				"All basic tests passed! Core migration functionality is working.",
			);
		} else {
			logError("Some tests failed. Please check the output above.");
		}
	} catch (error) {
		logError(
			`Test execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		await cleanupTestData();
	}
}

// Run tests if called directly
if (require.main === module) {
	runBasicTests();
}

export { runBasicTests };
