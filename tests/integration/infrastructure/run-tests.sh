#!/bin/bash

# Base API Infrastructure Test Runner
# This script runs all infrastructure tests with coverage reporting

set -e

echo "🧪 Running Base API Infrastructure Integration Tests"
echo "================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test directory
TEST_DIR="tests/integration/infrastructure"

# Run tests with coverage
echo -e "\n${YELLOW}Running tests with coverage...${NC}"
bun run test:integration --coverage --coverage.reporter=text --coverage.reporter=lcov --coverage.include="lib/api/base/**" $TEST_DIR

# Check if tests passed
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ All infrastructure tests passed!${NC}"
else
    echo -e "\n${RED}❌ Some tests failed!${NC}"
    exit 1
fi

# Generate coverage summary
echo -e "\n${YELLOW}Coverage Summary:${NC}"
echo "=================="

# Parse coverage from lcov file if it exists
if [ -f "coverage/lcov.info" ]; then
    # Extract coverage percentages
    LINES=$(lcov -l coverage/lcov.info 2>/dev/null | grep -oE '[0-9]+\.[0-9]+%' | tail -1 || echo "N/A")
    echo "Line Coverage: $LINES"
fi

# List all test files
echo -e "\n${YELLOW}Test Files:${NC}"
echo "==========="
find $TEST_DIR -name "*.test.ts" -type f | while read file; do
    basename "$file"
done

# Count assertions
echo -e "\n${YELLOW}Test Statistics:${NC}"
echo "================"
TOTAL_TESTS=$(grep -r "it(" $TEST_DIR/*.test.ts | wc -l | tr -d ' ')
TOTAL_DESCRIBES=$(grep -r "describe(" $TEST_DIR/*.test.ts | wc -l | tr -d ' ')
TOTAL_EXPECTS=$(grep -r "expect(" $TEST_DIR/*.test.ts | wc -l | tr -d ' ')

echo "Test Suites: $TOTAL_DESCRIBES"
echo "Test Cases: $TOTAL_TESTS"
echo "Assertions: $TOTAL_EXPECTS"

# Performance check
echo -e "\n${YELLOW}Performance Metrics:${NC}"
echo "==================="
END_TIME=$(date +%s)
START_TIME=$((END_TIME - SECONDS))
DURATION=$((END_TIME - START_TIME))
echo "Total Duration: ${DURATION}s"

# Check for specific test patterns
echo -e "\n${YELLOW}Test Coverage Areas:${NC}"
echo "===================="
echo "✅ Error Handling: $(grep -r "BaseAPIError\|ValidationError\|NotFoundError" $TEST_DIR/*.test.ts | wc -l | tr -d ' ') tests"
echo "✅ Service Logic: $(grep -r "BaseAPIService\|BaseCRUDService" $TEST_DIR/*.test.ts | wc -l | tr -d ' ') tests"
echo "✅ Request Handling: $(grep -r "BaseAPIHandler" $TEST_DIR/*.test.ts | wc -l | tr -d ' ') tests"
echo "✅ Query Building: $(grep -r "QueryBuilder" $TEST_DIR/*.test.ts | wc -l | tr -d ' ') tests"
echo "✅ Response Building: $(grep -r "ResponseBuilder" $TEST_DIR/*.test.ts | wc -l | tr -d ' ') tests"

echo -e "\n${GREEN}🎉 Infrastructure test run complete!${NC}"