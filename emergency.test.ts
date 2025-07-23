/**
 * EMERGENCY TEST - Ultra minimal test to verify infrastructure
 * 
 * This test uses no imports except the bare minimum to verify
 * that the test runner can actually execute something.
 */

import { test, expect } from 'vitest';

test('emergency infrastructure test', () => {
  // Most basic assertion possible
  expect(2 + 2).toBe(4);
});

test('emergency async test', async () => {
  // Basic async test to verify promises work
  const result = await Promise.resolve('test');
  expect(result).toBe('test');
});

test('emergency object test', () => {
  // Basic object assertion
  const obj = { name: 'test', value: 42 };
  expect(obj.name).toBe('test');
  expect(obj.value).toBe(42);
});