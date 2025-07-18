#!/usr/bin/env node

// Quick test runner to check if basic functionality works
console.log('Testing basic functionality...')

// Test 1: Simple math
const result = 2 + 2
console.log(`Basic math test: 2 + 2 = ${result}`, result === 4 ? '✓' : '✗')

// Test 2: Array operations
const arr = [1, 2, 3]
const sum = arr.reduce((a, b) => a + b, 0)
console.log(`Array sum test: [1,2,3] sum = ${sum}`, sum === 6 ? '✓' : '✗')

// Test 3: Object operations
const obj = { name: 'test', value: 42 }
console.log(`Object test: obj.value = ${obj.value}`, obj.value === 42 ? '✓' : '✗')

console.log('Quick tests completed!')
