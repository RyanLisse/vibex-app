#!/usr/bin/env node

/**
 * Merge coverage reports from different test tiers
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function mergeCoverage() {
  console.log('Merging coverage reports...');
  
  try {
    // Merge coverage reports if they exist
    const coverageDir = path.join(__dirname, '..', 'coverage');
    const bunCoverageDir = path.join(coverageDir, 'bun');
    const vitestCoverageDir = path.join(coverageDir, 'vitest');
    
    if (fs.existsSync(bunCoverageDir) && fs.existsSync(vitestCoverageDir)) {
      console.log('Found coverage reports from both Bun and Vitest');
      
      // Use nyc to merge coverage reports
      execSync('npx nyc merge coverage/bun coverage/vitest coverage/merged', { stdio: 'inherit' });
      execSync('npx nyc report --reporter=html --reporter=lcov --temp-dir=coverage/merged --report-dir=coverage/merged-report', { stdio: 'inherit' });
      
      console.log('✓ Coverage reports merged successfully');
    } else {
      console.log('Coverage reports not found for merging');
    }
  } catch (error) {
    console.error('✗ Failed to merge coverage reports:', error.message);
  }
}

mergeCoverage();
