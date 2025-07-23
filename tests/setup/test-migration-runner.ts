/**
 * Test Migration Runner
 * 
 * Provides database migration capabilities for integration tests
 * Handles test database setup, migrations, and cleanup
 */

import { db } from "@/db/config";
import { sql } from "drizzle-orm";
import { environments } from "@/db/schema";

export interface TestMigration {
  name: string;
  up: string;
  down: string;
}

export class TestMigrationRunner {
  private migrations: TestMigration[] = [];
  private appliedMigrations: Set<string> = new Set();

  constructor() {
    this.initializeTestMigrations();
  }

  /**
   * Initialize test-specific migrations
   */
  private initializeTestMigrations(): void {
    this.migrations = [
      {
        name: "001_test_environments_setup",
        up: `
          CREATE TABLE IF NOT EXISTS test_environments (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            config JSONB NOT NULL,
            user_id TEXT NOT NULL,
            is_active BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_test_environments_user_id ON test_environments(user_id);
          CREATE INDEX IF NOT EXISTS idx_test_environments_active ON test_environments(is_active);
        `,
        down: `
          DROP INDEX IF EXISTS idx_test_environments_active;
          DROP INDEX IF EXISTS idx_test_environments_user_id;
          DROP TABLE IF EXISTS test_environments;
        `,
      },
      {
        name: "002_test_data_seed",
        up: `
          INSERT INTO test_environments (id, name, config, user_id, is_active, created_at, updated_at)
          VALUES 
            ('test-env-1', 'Test Environment 1', '{"type": "development", "url": "http://localhost:3000"}', 'test-user-1', true, NOW(), NOW()),
            ('test-env-2', 'Test Environment 2', '{"type": "staging", "url": "http://staging.test.com"}', 'test-user-1', false, NOW(), NOW()),
            ('test-env-3', 'Test Environment 3', '{"type": "production", "url": "http://prod.test.com"}', 'test-user-2', true, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `,
        down: `
          DELETE FROM test_environments WHERE id LIKE 'test-env-%';
        `,
      },
    ];
  }

  /**
   * Apply all pending migrations
   */
  async runMigrations(): Promise<void> {
    for (const migration of this.migrations) {
      if (!this.appliedMigrations.has(migration.name)) {
        await this.executeMigration(migration);
        this.appliedMigrations.add(migration.name);
      }
    }
  }

  /**
   * Rollback all applied migrations
   */
  async rollbackMigrations(): Promise<void> {
    const reversedMigrations = [...this.migrations].reverse();

    for (const migration of reversedMigrations) {
      if (this.appliedMigrations.has(migration.name)) {
        await this.rollbackMigration(migration);
        this.appliedMigrations.delete(migration.name);
      }
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: TestMigration): Promise<void> {
    try {
      await sql`BEGIN`;
      
      const statements = migration.up
        .split(";")
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await db.execute(sql.raw(statement));
        }
      }

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      throw new Error(`Failed to execute migration ${migration.name}: ${error}`);
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: TestMigration): Promise<void> {
    try {
      await sql`BEGIN`;
      
      const statements = migration.down
        .split(";")
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await db.execute(sql.raw(statement));
        }
      }

      await sql`COMMIT`;
    } catch (error) {
      await sql`ROLLBACK`;
      throw new Error(`Failed to rollback migration ${migration.name}: ${error}`);
    }
  }

  /**
   * Reset test database to clean state
   */
  async resetDatabase(): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM environments WHERE id LIKE 'test-%'`);
      await db.execute(sql`DELETE FROM test_environments WHERE TRUE`);
      await db.execute(sql`SELECT setval(pg_get_serial_sequence('environments', 'id'), 1, false)`);
    } catch (error) {
      throw new Error(`Database reset failed: ${error}`);
    }
  }

  /**
   * Seed test data for integration tests
   */
  async seedTestData(): Promise<void> {
    try {
      const testEnvironments = [
        {
          id: "test-env-integration-1",
          name: "Integration Test Env 1",
          config: {
            type: "development",
            description: "Test environment for integration tests",
            url: "http://localhost:3001",
            variables: { NODE_ENV: "test" }
          },
          userId: "test-user-integration",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "test-env-integration-2", 
          name: "Integration Test Env 2",
          config: {
            type: "staging",
            description: "Staging test environment", 
            url: "http://staging.integration.test",
            variables: { NODE_ENV: "staging" }
          },
          userId: "test-user-integration",
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];

      for (const env of testEnvironments) {
        await db.insert(environments).values(env).onConflictDoNothing();
      }
    } catch (error) {
      throw new Error(`Test data seeding failed: ${error}`);
    }
  }

  /**
   * Clean up test data after tests
   */
  async cleanupTestData(): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM environments WHERE id LIKE 'test-%'`);
      await db.execute(sql`DELETE FROM environments WHERE user_id LIKE 'test-%'`);
    } catch (error) {
      throw new Error(`Test data cleanup failed: ${error}`);
    }
  }

  /**
   * Get list of applied migrations
   */
  getAppliedMigrations(): string[] {
    return Array.from(this.appliedMigrations);
  }

  /**
   * Check if a migration has been applied
   */
  isMigrationApplied(name: string): boolean {
    return this.appliedMigrations.has(name);
  }
}

export const testMigrationRunner = new TestMigrationRunner();

export const runTestMigrations = () => testMigrationRunner.runMigrations();
export const rollbackTestMigrations = () => testMigrationRunner.rollbackMigrations();
export const resetTestDatabase = () => testMigrationRunner.resetDatabase();
export const seedTestData = () => testMigrationRunner.seedTestData();
export const cleanupTestData = () => testMigrationRunner.cleanupTestData();