#!/bin/bash

# Safe Test Runner Script
# This script runs tests in batches to avoid hanging issues

echo "🧪 Safe Test Runner"
echo "=================="
echo ""

# Configuration
BATCH_SIZE=5
TIMEOUT_PER_BATCH=30
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_FILES=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find all test files
echo "🔍 Finding test files..."
TEST_FILES=($(find lib components hooks -name "*.test.ts" -o -name "*.test.tsx" | grep -v node_modules | grep -v ".bun.test" | sort))
TOTAL_FILES=${#TEST_FILES[@]}

echo "📋 Found $TOTAL_FILES test files"
echo ""

# Function to run a batch of tests
run_batch() {
    local files=("$@")
    local batch_files="${files[@]}"
    
    echo -e "${YELLOW}Running batch of ${#files[@]} files...${NC}"
    
    # Run tests with timeout
    if timeout $TIMEOUT_PER_BATCH npx vitest run --config=vitest.config.ts ${batch_files} --reporter=json > test-results.json 2>&1; then
        # Parse results
        if [ -f test-results.json ]; then
            local passed=$(grep -o '"passed":[0-9]*' test-results.json | grep -o '[0-9]*' | awk '{sum+=$1} END {print sum}')
            local failed=$(grep -o '"failed":[0-9]*' test-results.json | grep -o '[0-9]*' | awk '{sum+=$1} END {print sum}')
            
            PASSED_TESTS=$((PASSED_TESTS + ${passed:-0}))
            FAILED_TESTS=$((FAILED_TESTS + ${failed:-0}))
            
            echo -e "${GREEN}✅ Batch completed: ${passed:-0} passed, ${failed:-0} failed${NC}"
        else
            echo -e "${GREEN}✅ Batch completed${NC}"
        fi
    else
        echo -e "${RED}❌ Batch timed out or failed${NC}"
        FAILED_FILES+=("${files[@]}")
    fi
    
    # Clean up
    rm -f test-results.json
    echo ""
}

# Run tests in batches
echo "🚀 Running tests in batches of $BATCH_SIZE files..."
echo ""

for (( i=0; i<$TOTAL_FILES; i+=$BATCH_SIZE )); do
    batch=("${TEST_FILES[@]:i:BATCH_SIZE}")
    echo "📦 Batch $((i/BATCH_SIZE + 1)) of $(((TOTAL_FILES + BATCH_SIZE - 1) / BATCH_SIZE))"
    run_batch "${batch[@]}"
done

# Summary
echo "📊 Test Summary"
echo "=============="
echo "Total files: $TOTAL_FILES"
echo -e "Passed tests: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed tests: ${RED}$FAILED_TESTS${NC}"

if [ ${#FAILED_FILES[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed files:${NC}"
    for file in "${FAILED_FILES[@]}"; do
        echo "  - $file"
    done
    exit 1
else
    echo ""
    echo -e "${GREEN}✨ All tests completed successfully!${NC}"
    exit 0
fi