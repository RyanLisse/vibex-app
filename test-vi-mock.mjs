#!/usr/bin/env node
import { createVitest } from 'vitest/node';

async function testViMock() {
  console.log('Testing vi.mock functionality...\n');
  
  try {
    const vitest = await createVitest('test', {
      watch: false,
      globals: true,
      environment: 'jsdom',
    });
    
    // Try to access vi
    const { vi } = await import('vitest');
    console.log('✅ vi imported successfully');
    console.log('✅ vi.mock is:', typeof vi.mock);
    console.log('✅ vi.fn is:', typeof vi.fn);
    console.log('✅ vi.spyOn is:', typeof vi.spyOn);
    
    // Check if we're in Bun runtime
    console.log('\nRuntime check:');
    console.log('- process.versions.node:', process.versions.node);
    console.log('- process.versions.bun:', process.versions.bun);
    console.log('- globalThis.Bun:', typeof globalThis.Bun);
    
    await vitest.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testViMock();