# Data Migration Guide

## Overview

This guide covers the comprehensive data migration system that transitions data from localStorage to a PostgreSQL database with Drizzle ORM. The migration system includes automatic backup, conflict resolution, and rollback capabilities.

## Migration Architecture

```
┌────────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   localStorage     │ --> │ Migration Engine │ --> │ PostgreSQL + ORM │
│  (Legacy Storage)  │     │  (TypeScript)    │     │ (New Storage)    │
└────────────────────┘     └─────────────────┘     └──────────────────┘
         ↓                          ↓                         ↓
    ┌─────────┐              ┌──────────┐            ┌──────────────┐
    │ Backup  │              │ Progress │            │ ElectricSQL  │
    │ System  │              │ Tracking │            │  Real-time   │
    └─────────┘              └──────────┘            └──────────────┘
```

## Quick Start

### 1. Check Migration Status

```bash
# Check if migration is needed
bun run migration:status

# Verbose output with details
bun run migration:status --verbose

# User-specific status
bun run migration:status --user-id <userId>
```

### 2. Run Migration

```bash
# Basic migration (with automatic backup)
bun run migration:migrate

# Dry run to preview changes
bun run migration:migrate --dry-run

# Skip backup creation
bun run migration:migrate --no-backup

# Continue on errors
bun run migration:migrate --continue-on-error
```

### 3. Backup Management

```bash
# List all backups
bun run migration backup list

# Create manual backup
bun run migration backup create

# Restore from backup
bun run migration backup restore <backupId>
```

## Migration Process

### Phase 1: Pre-Migration

1. **Data Analysis**
   - Scan localStorage for known keys
   - Identify data types and structures
   - Calculate data sizes
   - Check for conflicts

2. **Backup Creation**
   - Create timestamped backup
   - Generate checksum for integrity
   - Store backup metadata
   - Compress if configured

### Phase 2: Migration Execution

1. **Data Extraction**

   ```typescript
   // Extracted data structure
   {
     tasks: Task[]
     environments: Environment[]
     formData: Record<string, any>
     userPreferences: UserPreferences
     customData: Record<string, any>
   }
   ```

2. **Transformation Pipeline**
   - Parse JSON data
   - Validate with Zod schemas
   - Transform to database format
   - Handle type conversions

3. **Database Insertion**
   - Batch inserts for performance
   - Transaction management
   - Conflict resolution
   - Progress tracking

### Phase 3: Post-Migration

1. **Validation**
   - Verify data integrity
   - Check record counts
   - Validate relationships
   - Test queries

2. **Cleanup**
   - Optional localStorage clearing
   - Update migration status
   - Generate report

## Data Types & Mappings

### Tasks Migration

```typescript
// localStorage format
{
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
  createdAt: string; // ISO date
}

// Database format
{
  id: string; // ULID
  title: string;
  status: "pending" | "in_progress" | "completed";
  userId: string; // Added during migration
  createdAt: Date;
  updatedAt: Date;
}
```

### Environments Migration

```typescript
// localStorage format
{
  id: string
  name: string
  config: {
    githubToken?: string
    // Other config
  }
}

// Database format
{
  id: string // ULID
  name: string
  description: string | null
  config: JsonB // PostgreSQL JSON
  isActive: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
  schemaVersion: number
}
```

## Conflict Resolution

### Strategies

1. **SKIP** - Skip conflicting items
2. **OVERWRITE** - Replace existing data
3. **MERGE** - Merge with existing data
4. **INTERACTIVE** - Prompt for each conflict

### Configuration

```typescript
const migrationConfig = {
  conflictResolution: "MERGE",
  mergeStrategy: {
    tasks: "NEWEST", // Use newest based on timestamp
    environments: "PROMPT", // Ask user
    formData: "OVERWRITE", // Always overwrite
  },
};
```

## Error Handling

### Retry Logic

```typescript
// Automatic retry configuration
{
  retryAttempts: 3,
  retryBackoff: 1000, // ms
  continueOnError: false
}
```

### Common Errors

1. **Invalid Data Format**
   - Solution: Update transformation logic
   - Fallback: Skip item and log

2. **Database Constraint Violation**
   - Solution: Check unique constraints
   - Fallback: Generate new ID

3. **Connection Timeout**
   - Solution: Increase timeout
   - Fallback: Resume from checkpoint

## Advanced Usage

### Custom Migration Scripts

```typescript
import { MigrationManager } from "@/lib/migration";

// Custom migration with hooks
const migration = new MigrationManager({
  beforeMigration: async (data) => {
    // Custom preprocessing
    return processedData;
  },

  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  },

  afterMigration: async (result) => {
    // Custom post-processing
    await notifyUser(result);
  },
});

await migration.execute();
```

### Batch Processing

```typescript
// Configure batch size for large datasets
const config = {
  batchSize: 100, // Process 100 items at a time
  batchDelay: 500, // 500ms between batches
  maxConcurrent: 5, // Max concurrent operations
};
```

### Selective Migration

```typescript
// Migrate specific data types only
await migrationManager.migrate({
  includeTypes: ["tasks", "environments"],
  excludeTypes: ["formData"],
  dateRange: {
    from: new Date("2024-01-01"),
    to: new Date(),
  },
});
```

## Monitoring & Debugging

### Progress Tracking

```typescript
// Real-time progress updates
migrationManager.on("progress", (event) => {
  console.log({
    stage: event.stage,
    current: event.current,
    total: event.total,
    percentage: event.percentage,
    estimatedTimeRemaining: event.eta,
  });
});
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=migration:* bun run migration:migrate

# Specific debug categories
DEBUG=migration:extract,migration:transform bun run migration:migrate
```

### Migration Logs

```typescript
// Log locations
{
  success: './logs/migration-success.log',
  errors: './logs/migration-errors.log',
  conflicts: './logs/migration-conflicts.log',
  performance: './logs/migration-performance.log'
}
```

## Rollback Procedures

### Automatic Rollback

```typescript
// Triggered on critical errors
{
  autoRollback: true,
  rollbackThreshold: 0.1, // 10% failure rate
  preservePartialData: false
}
```

### Manual Rollback

```bash
# Rollback to specific backup
bun run migration rollback --backup-id <backupId>

# Rollback to timestamp
bun run migration rollback --before "2024-01-15T10:00:00Z"
```

## Performance Optimization

### Large Dataset Handling

1. **Streaming Processing**
   - Process data in chunks
   - Minimize memory usage
   - Progress persistence

2. **Parallel Execution**
   - Multiple worker threads
   - Concurrent transformations
   - Synchronized writes

3. **Index Management**
   - Disable indexes during bulk insert
   - Rebuild after migration
   - Analyze tables

### Performance Metrics

```typescript
// Track migration performance
{
  itemsPerSecond: 1000,
  averageItemSize: 2048, // bytes
  peakMemoryUsage: 512, // MB
  totalDuration: 300000 // ms
}
```

## Testing Migrations

### Unit Tests

```typescript
describe("Migration System", () => {
  it("should transform localStorage data correctly", async () => {
    const input = {
      /* localStorage data */
    };
    const output = await transformer.transform(input);
    expect(output).toMatchSchema(databaseSchema);
  });
});
```

### Integration Tests

```typescript
// Test full migration flow
it("should migrate all data types", async () => {
  // Setup test data
  await setupTestLocalStorage();

  // Run migration
  const result = await migrationManager.migrate({
    dryRun: false,
    testMode: true,
  });

  // Verify results
  expect(result.success).toBe(true);
  expect(result.itemsProcessed).toBe(100);
});
```

## Security Considerations

### Sensitive Data Handling

1. **Encryption**
   - Encrypt sensitive fields during migration
   - Use environment-specific keys
   - Secure key storage

2. **Data Sanitization**
   - Remove PII if configured
   - Validate all inputs
   - Escape special characters

3. **Access Control**
   - Require authentication for migration
   - Log all migration activities
   - Audit trail maintenance

### Backup Security

```typescript
// Secure backup configuration
{
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2'
  },
  storage: {
    location: 'secure-bucket',
    retention: 30 // days
  }
}
```

## Troubleshooting

### Common Issues

1. **Migration Stuck**

   ```bash
   # Check status
   bun run migration:status

   # Force unlock
   bun run migration unlock --force
   ```

2. **Data Corruption**

   ```bash
   # Validate data integrity
   bun run migration validate

   # Repair corrupted data
   bun run migration repair --auto-fix
   ```

3. **Performance Issues**

   ```bash
   # Analyze performance
   bun run migration analyze --profile

   # Optimize configuration
   bun run migration optimize
   ```

### Debug Commands

```bash
# Detailed migration info
bun run migration info --detailed

# Export migration data
bun run migration export --format json

# Test connection
bun run migration test-connection
```

## Best Practices

1. **Always Create Backups**
   - Before major migrations
   - Test restore process
   - Verify backup integrity

2. **Test in Staging**
   - Use production-like data
   - Verify all features work
   - Check performance impact

3. **Monitor Post-Migration**
   - Watch error rates
   - Check query performance
   - Verify data integrity

4. **Document Changes**
   - Keep migration logs
   - Document custom logic
   - Update runbooks

## Migration Checklist

- [ ] Backup current data
- [ ] Test migration in staging
- [ ] Review conflict resolution strategy
- [ ] Configure monitoring
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window
- [ ] Run migration
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Monitor for issues
- [ ] Clean up old data (if configured)
- [ ] Update documentation

## Support

For additional help:

- Check logs in `./logs/migration-*.log`
- Review error details in migration reports
- Contact team for complex scenarios
