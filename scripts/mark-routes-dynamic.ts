#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { join } from 'path'

// Find all API routes that might have issues
const apiRoutes = [
  'app/api/agents/voice/route.ts',
  'app/api/agents/brainstorm/route.ts',
  'app/api/ai/gemini/session/route.ts',
]

// Add dynamic export to force dynamic rendering
const dynamicExport = `\n// Force dynamic rendering to avoid build-time issues\nexport const dynamic = 'force-dynamic'\n`

let fixedCount = 0

for (const route of apiRoutes) {
  const filePath = join(process.cwd(), route)
  if (existsSync(filePath)) {
    let content = readFileSync(filePath, 'utf-8')

    // Check if already has dynamic export
    if (!content.includes('export const dynamic')) {
      // Add at the top after imports
      const importMatch = content.match(/((?:import[^;]+;\s*)+)/s)
      if (importMatch) {
        const imports = importMatch[0]
        content = content.replace(imports, imports + dynamicExport)
      } else {
        // Just add at the beginning
        content = dynamicExport + content
      }

      writeFileSync(filePath, content)
      console.log(`✅ Marked ${route} as dynamic`)
      fixedCount++
    }
  }
}

// Also find all routes that use getLogger
const allRoutes = glob.sync('app/api/**/route.ts', { cwd: process.cwd() })
for (const route of allRoutes) {
  const filePath = join(process.cwd(), route)
  const content = readFileSync(filePath, 'utf-8')

  if (content.includes('getLogger') && !content.includes('export const dynamic')) {
    let newContent = content

    // Add dynamic export after imports
    const importMatch = content.match(/((?:import[^;]+;\s*)+)/s)
    if (importMatch) {
      const imports = importMatch[0]
      newContent = content.replace(imports, imports + dynamicExport)
    } else {
      newContent = dynamicExport + content
    }

    writeFileSync(filePath, newContent)
    console.log(`✅ Marked ${route} as dynamic (uses getLogger)`)
    fixedCount++
  }
}

console.log(`\n✨ Total routes marked as dynamic: ${fixedCount}`)
