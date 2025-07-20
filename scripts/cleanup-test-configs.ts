#!/usr/bin/env bun

import { promises as fs } from 'fs'
import path from 'path'

const configsToRemove = [
  'vitest.working.config.ts',
  'vitest.optimized.config.ts',
  'vitest.final.config.ts',
  'vitest.components.working.config.ts',
  'vitest.components.stable.config.ts',
]

const configsToKeep = [
  'vitest.config.ts',
  'vitest.components.config.ts',
  'vitest.integration.config.ts',
  'vitest.browser.config.ts',
  'vitest.shared.config.ts',
  'vitest.workspace.ts',
]

async function cleanupConfigs() {
  console.log('🧹 Cleaning up redundant test configurations...\n')
  
  let removedCount = 0
  
  for (const config of configsToRemove) {
    const filePath = path.join(process.cwd(), config)
    try {
      await fs.unlink(filePath)
      console.log(`✓ Removed: ${config}`)
      removedCount++
    } catch (error) {
      // File doesn't exist, that's fine
    }
  }
  
  console.log(`\n✨ Cleanup completed!`)
  console.log(`   - Removed ${removedCount} redundant configs`)
  console.log(`   - Kept ${configsToKeep.length} essential configs:`)
  configsToKeep.forEach(config => console.log(`     • ${config}`))
}

cleanupConfigs().catch((error) => {
  console.error('Failed to cleanup configs:', error)
  process.exit(1)
})