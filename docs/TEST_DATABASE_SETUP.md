# Test Database Setup

This project supports multiple approaches for database testing, ranging from fully mocked to real database instances.

## Available Test Configurations

### 1. Mocked Database (Default)
- **Command**: `bun run test:integration`
- **Config**: `vitest.integration.config.ts`
- **Setup**: `tests/setup/integration.ts`
- Uses fully mocked database connections
- Fast execution, no external dependencies
- Good for CI/CD pipelines

### 2. Conditional Database (Recommended)
- **Command**: `bun run test:integration:simple`
- **Config**: `vitest.integration.simple.config.ts`
- **Setup**: `tests/setup/integration-simple.ts`
- Automatically detects if a real database is available
- Falls back to mocks if no database connection
- Best balance of speed and realism

### 3. Neon Database Branching (Advanced)
- **Command**: `bun run test:integration:neon`
- **Config**: `vitest.integration.neon.config.ts`
- **Setup**: `tests/setup/integration-neon.ts`
- Uses Neon's branching feature for isolated test databases
- Requires `NEON_API_KEY` environment variable

## Environment Variables

### For Real Database Testing

```bash
# Use your actual Neon database URL
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require

# For Neon branching (optional)
NEON_PROJECT_ID=your-project-id
NEON_API_KEY=your-api-key
```

### For Test-Specific Database

```bash
# Use a dedicated test database
TEST_DATABASE_URL=postgresql://user:pass@host.neon.tech/testdb?sslmode=require
```

## Running Tests

### With Mocked Database (Fast)
```bash
bun run test:integration
```

### With Conditional Database (Recommended)
```bash
# Uses mocks by default
bun run test:integration:simple

# Use real database
DATABASE_URL=your-neon-url bun run test:integration:simple
```

### With Neon Branching
```bash
# Requires NEON_API_KEY
NEON_API_KEY=your-key bun run test:integration:neon
```

## Best Practices

1. **Local Development**: Use mocked tests for fast feedback
2. **Pre-commit**: Run conditional tests with real database if available
3. **CI/CD**: Use mocked tests for speed, real database for critical paths
4. **Integration Testing**: Use real database to catch edge cases

## Database Migration Testing

The migration tests automatically adapt based on the database configuration:

- **Mocked**: Tests migration logic without actual database operations
- **Real Database**: Tests actual schema changes and rollbacks

## Troubleshooting

### Tests Hanging
- Check database connection timeout settings
- Ensure test cleanup is working properly
- Use `--no-coverage` flag for faster execution

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check network connectivity to Neon
- Ensure SSL mode is set correctly

### Mock vs Real Behavior Differences
- Real databases enforce constraints mocks might miss
- Timing and concurrency behave differently
- Use conditional setup to test both scenarios