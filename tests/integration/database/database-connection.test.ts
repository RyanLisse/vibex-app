/**
 * Database Connection Integration Test
 *
 * Verifies that the database connection and basic operations work correctly
 */

import { describe, expect, it } from 'vitest'
import { checkDatabaseHealth, db } from '../../../db/config'

describe('Database Connection', () => {
  it('should check database health', async () => {
    const isHealthy = await checkDatabaseHealth()
    expect(isHealthy).toBe(true)
  })

  it('should have proper database configuration', async () => {
    expect(db).toBeDefined()

    // The db object should have methods like select, insert, etc.
    expect(typeof db.select).toBe('function')
    expect(typeof db.insert).toBe('function')
    expect(typeof db.update).toBe('function')
    expect(typeof db.delete).toBe('function')
  })

  it('should handle basic database operations', async () => {
    // Test that we can call db methods without errors
    const selectQuery = db.select()
    expect(selectQuery).toBeDefined()
    expect(typeof selectQuery.from).toBe('function')

    const insertQuery = db.insert({ test: 'value' })
    expect(insertQuery).toBeDefined()
    expect(typeof insertQuery.values).toBe('function')
  })
})
