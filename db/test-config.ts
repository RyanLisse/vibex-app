/**
 * Test Database Configuration
 *
 * This module provides mocked database instances for testing
 */

import { vi } from "vitest";

// Mock database connection
export const db = {
	select: vi.fn(() => ({
		from: vi.fn(() => ({
			where: vi.fn(() => ({
				limit: vi.fn().mockResolvedValue([]),
				orderBy: vi.fn(() => ({
					limit: vi.fn().mockResolvedValue([]),
				})),
			})),
			limit: vi.fn().mockResolvedValue([]),
			orderBy: vi.fn(() => ({
				limit: vi.fn().mockResolvedValue([]),
			})),
			leftJoin: vi.fn(() => ({
				where: vi.fn(() => ({
					groupBy: vi.fn(() => Promise.resolve([])),
					orderBy: vi.fn(() => Promise.resolve([])),
				})),
				groupBy: vi.fn(() => Promise.resolve([])),
				orderBy: vi.fn(() => Promise.resolve([])),
				limit: vi.fn().mockResolvedValue([]),
			})),
			groupBy: vi.fn(() => Promise.resolve([])),
		})),
	})),
	insert: vi.fn(() => ({
		values: vi.fn(() => ({
			returning: vi.fn().mockResolvedValue([
				{
					id: "test-id-" + Date.now(),
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]),
		})),
	})),
	update: vi.fn(() => ({
		set: vi.fn(() => ({
			where: vi.fn(() => ({
				returning: vi.fn().mockResolvedValue([
					{
						id: "test-id-" + Date.now(),
						updatedAt: new Date(),
					},
				]),
			})),
		})),
	})),
	delete: vi.fn(() => ({
		where: vi.fn().mockResolvedValue(undefined),
	})),
	transaction: vi.fn((fn) => fn(db)),
};

// Mock database health check
export const checkDatabaseHealth = vi.fn().mockResolvedValue(true);

// Mock database initialization
export const initializeExtensions = vi.fn().mockResolvedValue(true);

// Mock database connection close
export const closeDatabaseConnection = vi.fn().mockResolvedValue(undefined);
