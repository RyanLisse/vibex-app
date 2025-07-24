# Centralized Test Organization

This directory provides a centralized view of all tests in the project, organized by test type.

## Directory Structure

- **unit-tests/** - Bun logic tests for utilities, schemas, and pure functions
- **integration-tests/** - Vitest integration tests for API routes, database, and services
- **e2e-tests/** - Playwright end-to-end tests for full user workflows

## Test Execution

### Run all unit tests (Bun logic tests)
```bash
bun run test:unit:logic
```

### Run all component tests (Vitest)
```bash
bun run test:unit:components
```

### Run all integration tests (Vitest)
```bash
bun run test:integration
```

### Run all E2E tests (Playwright)
```bash
bun run test:e2e
```

### Run all tests
```bash
bun run test:all
```

## Coverage Reports

Coverage reports are generated separately for each test type and then merged:

- Bun logic tests: `coverage/bun-logic/`
- Component tests: `coverage/components/`
- Integration tests: `coverage/integration/`
- Merged report: `coverage/final-report/`

To generate a full coverage report:
```bash
bun run test:coverage:all
```