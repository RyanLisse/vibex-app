# Implementation Plan

- [x] 1. Configure Bun test runner for utility/logic tests only
  - Update bunfig.toml to include only non-React test file patterns
  - Configure Bun to exclude all React component tests and integration/E2E tests
  - Set up proper mock configuration and environment settings
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Configure Vitest for integration tests with Inngest support
  - Verify vitest.integration.config.ts with Node.js environment for integration tests
  - Configure test patterns to include API routes, database operations, and Inngest functions
  - Set up @inngest/test integration for workflow testing
  - Configure coverage reporting specific to integration tests
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Update package.json scripts for hybrid test execution
  - Add test:unit:logic script for Bun-based utility tests
  - Add test:unit:components script for Vitest-based React component tests
  - Update test:unit script to run both logic and component tests sequentially
  - Update test:all script to run all test types in proper sequence
  - Add watch mode scripts for both logic and component tests
  - Add coverage scripts for each test type
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Convert Vitest mocking calls to Bun's mock API in logic tests
  - Identify all vi.mock() calls in utility test files and convert to mock.module()
  - Replace vi.spyOn() calls with Bun's mock.spyOn() API
  - Update vi.mocked() usage to use Bun's mock API
  - Fix mock restoration patterns to use mock.restore()
  - _Requirements: 5.1_

- [x] 5. Fix console mocking issues in telemetry and stream-utils tests
  - Standardize console mocking patterns using Bun's mock API
  - Fix inconsistent console spy variable naming and usage
  - Ensure proper mock cleanup in afterEach hooks
  - Test console mocking functionality across all affected test files
  - _Requirements: 5.3_

- [-] 6. Resolve import/export errors in utility modules
  - Add missing revokeToken export to lib/github-api.ts
  - Fix missing exports in lib/auth/index.ts
  - Verify all utility functions and types are properly exported
  - Test import resolution across all utility test files
  - _Requirements: 5.2_

- [ ] 7. Verify and fix path alias resolution across test environments
  - Test @/ alias resolution in Bun test environment
  - Verify @/components, @/lib, @/hooks aliases work in Vitest
  - Fix any path resolution issues in test files
  - Ensure consistent alias behavior across all test runners
  - _Requirements: 5.4_

- [ ] 8. Validate integration and E2E test configurations
  - Verify vitest.integration.config.ts works with current integration tests
  - Test integration test execution with proper Node.js environment
  - Confirm Playwright E2E tests remain functional and unchanged
  - Validate that integration tests don't conflict with unit tests
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8.1. Validate Inngest testing integration
  - Test @inngest/test integration with existing Inngest functions
  - Verify Inngest function execution testing with InngestTestEngine
  - Validate event simulation and workflow testing capabilities
  - Test retry logic and failure handling in Inngest functions
  - _Requirements: 2.3, 2.4_

- [ ] 9. Implement unified coverage reporting system
  - Configure Bun coverage reporting for logic tests
  - Set up Vitest coverage for component tests with separate output directory
  - Create coverage merge script to combine reports from different test types
  - Configure coverage thresholds for each test tier
  - Test coverage report generation and accuracy
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 10. Implement enhanced testing patterns from Strapi guide
  - Set up centralized test organization with all-tests folder structure
  - Create vitest-setup.js with @testing-library/jest-dom integration
  - Add server component testing patterns for integration tests
  - Implement API route testing with proper mocking
  - Add E2E API mocking patterns for Playwright tests
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [ ] 10.1. Implement AI SDK testing patterns from Chat SDK guide
  - Create mock language models using MockLanguageModelV1 from ai/test
  - Set up deterministic AI response testing with simulateReadableStream
  - Implement AI chat E2E testing with helper classes
  - Add AI API route testing for streaming responses
  - Create prompt-based response mapping for consistent testing
  - _Requirements: 2.3, 2.4, 4.1, 4.2_

- [ ] 11. Create test execution validation and documentation
  - Run full test suite to verify no hanging processes or conflicts
  - Test all package.json scripts work correctly
  - Validate test isolation between different runners
  - Create troubleshooting guide for common issues
  - Document testing patterns and best practices for future development
  - _Requirements: 7.1, 7.2, 7.3, 7.4_
