/**
 * Test Database Setup
 * 
 * Provides comprehensive database setup for integration tests
 * Handles database connection, migration, seeding, and cleanup
 */

import { testMigrationRunner, type TestMigrationRunner } from "./test-migration-runner";
import { db } from "@/db/config";
import { sql } from "drizzle-orm";

export interface TestDatabaseConfig {
  autoMigrate?: boolean;
  autoSeed?: boolean;
  autoCleanup?: boolean;
  isolateTests?: boolean;
}

export class TestDatabaseSetup {
  private migrationRunner: TestMigrationRunner;
  private isSetup: boolean = false;
  private config: TestDatabaseConfig;

  constructor(config: TestDatabaseConfig = {}) {
    this.migrationRunner = testMigrationRunner;
    this.config = {
      autoMigrate: true,
      autoSeed: true,
      autoCleanup: true,
      isolateTests: true,
      ...config,
    };
  }

  /**
   * Setup test database environment
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      return;
    }

    await this.verifyDatabaseConnection();

    if (this.config.autoMigrate) {
      await this.migrationRunner.runMigrations();
    }

    if (this.config.autoSeed) {
      await this.migrationRunner.seedTestData();
    }

    this.isSetup = true;
  }

  /**
   * Teardown test database environment
   */
  async teardown(): Promise<void> {
    if (!this.isSetup) {
      return;
    }

    if (this.config.autoCleanup) {
      await this.migrationRunner.cleanupTestData();
    }

    if (this.config.autoMigrate) {
      await this.migrationRunner.rollbackMigrations();
    }

    this.isSetup = false;
  }

  /**
   * Reset database to clean state between tests
   */
  async reset(): Promise<void> {
    if (!this.isSetup) {
      await this.setup();
      return;
    }

    await this.migrationRunner.resetDatabase();

    if (this.config.autoSeed) {
      await this.migrationRunner.seedTestData();
    }
  }

  /**
   * Verify database connection is working
   */
  private async verifyDatabaseConnection(): Promise<void> {
    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Create isolated test transaction
   */
  async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.config.isolateTests) {
      return callback();
    }

    try {
      await sql`BEGIN`;
      const result = await callback();
      await sql`ROLLBACK`;
      return result;
    } catch (error) {
      await sql`ROLLBACK`;
      throw error;
    }
  }

  /**
   * Get test database status
   */
  getStatus(): {
    isSetup: boolean;
    appliedMigrations: string[];
    config: TestDatabaseConfig;
  } {
    return {
      isSetup: this.isSetup,
      appliedMigrations: this.migrationRunner.getAppliedMigrations(),
      config: this.config,
    };
  }

  /**
   * Force cleanup (for emergency situations)
   */
  async forceCleanup(): Promise<void> {
    try {
      await this.migrationRunner.cleanupTestData();
      await this.migrationRunner.rollbackMigrations();
      await this.migrationRunner.resetDatabase();
    } catch (error) {
      throw new Error(`Force cleanup failed: ${error}`);
    }
  }
}

// Global test database setup instance
export const testDatabase = new TestDatabaseSetup();

// Vitest setup hooks
export const setupTestDatabase = async () => {
  await testDatabase.setup();
};

export const teardownTestDatabase = async () => {
  await testDatabase.teardown();
};

export const resetTestDatabase = async () => {
  await testDatabase.reset();
};

// Jest/Vitest integration helpers
export const beforeAllTestDatabase = setupTestDatabase;
export const afterAllTestDatabase = teardownTestDatabase;
export const beforeEachTestDatabase = resetTestDatabase;

// Transaction isolation helper
export const withTestTransaction = <T>(callback: () => Promise<T>): Promise<T> => {
  return testDatabase.withTransaction(callback);
};

// Database assertion helpers
export const assertDatabaseClean = async (): Promise<void> => {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM environments 
    WHERE id LIKE 'test-%' OR user_id LIKE 'test-%'
  `);
  
  const count = Number(result[0]?.count || 0);
  if (count > 0) {
    throw new Error(`Database not clean: found ${count} test records`);
  }
};

export const assertTestDataExists = async (): Promise<void> => {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM environments 
    WHERE id LIKE 'test-env-integration-%'
  `);
  
  const count = Number(result[0]?.count || 0);
  if (count === 0) {
    throw new Error("Test data not found in database");
  }
};