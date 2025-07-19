# Requirements Document

## Introduction

This feature implements a hybrid testing approach to resolve all remaining testing issues in the vibex-app project. The solution separates concerns by using Bun for utility/logic tests and Vitest for React component tests, while maintaining integration and E2E testing capabilities. This approach leverages each tool's strengths while avoiding their respective limitations.

## Requirements

### Requirement 1

**User Story:** As a developer, I want utility and logic tests to run efficiently with Bun, so that I can benefit from Bun's fast execution for non-React code.

#### Acceptance Criteria

1. WHEN configuring Bun test runner THEN the system SHALL include only non-React test files in bunfig.toml
2. WHEN running Bun tests THEN the system SHALL execute tests for lib/**/\*.test.{js,ts}, src/lib/**/_.test.{js,ts}, src/schemas/\*\*/_.test.{js,ts}, stores/**/\*.test.{js,ts}, and src/hooks/useZodForm/**/\*.test.{js,ts}
3. WHEN running Bun tests THEN the system SHALL exclude all React component tests including **/\*.test.{jsx,tsx}, components/**, app/**, and hooks/** with JSX/TSX
4. WHEN Bun encounters mocking requirements THEN the system SHALL use Bun's native mock.module/mock() API instead of Vitest's vi.mock/vi.spyOn

### Requirement 2

**User Story:** As a developer, I want integration tests to run with Vitest and proper Node.js environment, so that I can test API routes, database operations, and service integrations effectively.

#### Acceptance Criteria

1. WHEN configuring Vitest for integration THEN the system SHALL use vitest.integration.config.ts with Node.js environment
2. WHEN running integration tests THEN the system SHALL execute API routes, database operations, Inngest functions, and service integration tests
3. WHEN integration tests run THEN the system SHALL provide proper mocking and testing utilities for external services and Inngest workflows
4. WHEN integration tests execute THEN the system SHALL support async operations, database transactions, Inngest function testing with @inngest/test, and AI model mocking with ai/test

### Requirement 3

**User Story:** As a developer, I want clear separation of test execution commands, so that I can run different types of tests independently or together.

#### Acceptance Criteria

1. WHEN updating package.json scripts THEN the system SHALL provide test:unit:logic command for Bun tests
2. WHEN updating package.json scripts THEN the system SHALL provide test:integration command for Vitest integration tests
3. WHEN updating package.json scripts THEN the system SHALL provide test:unit command that runs logic tests with Bun
4. WHEN running test:all THEN the system SHALL execute tests in sequence: unit tests (Bun) → integration tests (Vitest) → e2e tests (Playwright/Stagehand)

### Requirement 4

**User Story:** As a developer, I want integration and E2E tests to remain functional, so that I can maintain comprehensive test coverage across all application layers.

#### Acceptance Criteria

1. WHEN verifying integration tests THEN the system SHALL confirm vitest.integration.config.ts is properly configured
2. WHEN running integration tests THEN the system SHALL execute with Vitest and appropriate test environment
3. WHEN running E2E tests THEN the system SHALL maintain Playwright configuration and functionality
4. WHEN executing full test suite THEN the system SHALL run all test types without conflicts or hanging processes

### Requirement 5

**User Story:** As a developer, I want all existing test failures to be resolved, so that I can have a reliable testing foundation.

#### Acceptance Criteria

1. WHEN fixing Bun-specific issues THEN the system SHALL convert all Vitest vi.mock/vi.spyOn calls to Bun's mock API
2. WHEN resolving import/export errors THEN the system SHALL fix missing exports in lib/github-api.ts and lib/auth/index.ts
3. WHEN addressing console mocking THEN the system SHALL resolve console mocking issues in telemetry and stream-utils tests
4. WHEN fixing import paths THEN the system SHALL ensure all configured aliases (@/, @/components, etc.) work correctly

### Requirement 6

**User Story:** As a developer, I want comprehensive coverage reporting, so that I can monitor test coverage across different test types.

#### Acceptance Criteria

1. WHEN running logic tests THEN the system SHALL generate coverage reports for Bun-tested files
2. WHEN running integration tests THEN the system SHALL generate coverage reports for Vitest-tested files
3. WHEN running E2E tests THEN the system SHALL generate functional coverage metrics with Playwright
4. WHEN combining coverage THEN the system SHALL provide unified coverage reporting across all test types

### Requirement 7

**User Story:** As a developer, I want comprehensive AI model testing capabilities, so that I can test AI-powered features with deterministic and reliable results.

#### Acceptance Criteria

1. WHEN testing AI-powered features THEN the system SHALL provide mock language models using MockLanguageModelV1 from ai/test
2. WHEN testing AI streaming responses THEN the system SHALL simulate readable streams with deterministic chunks
3. WHEN testing AI chat functionality THEN the system SHALL provide E2E testing patterns with helper classes
4. WHEN testing AI API routes THEN the system SHALL support streaming response validation and prompt-based response mapping

### Requirement 8

**User Story:** As a developer, I want the testing framework to be maintainable and scalable, so that future test additions follow clear patterns.

#### Acceptance Criteria

1. WHEN adding new utility tests THEN the system SHALL automatically include them in Bun test execution
2. WHEN adding new component tests THEN the system SHALL automatically include them in Vitest execution
3. WHEN configuring test environments THEN the system SHALL provide clear documentation and examples
4. WHEN troubleshooting tests THEN the system SHALL provide clear error messages and debugging capabilities
