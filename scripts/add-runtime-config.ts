#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

// Find all API routes
const routes = glob.sync('app/api/**/route.ts', { cwd: process.cwd() })

let fixed = 0

for (const route of routes) {
  const filePath = join(process.cwd(), route)
  let content = readFileSync(filePath, 'utf-8')

  // Check if it has dynamic but not runtime
  if (
    content.includes("export const dynamic = 'force-dynamic'") &&
    !content.includes('export const runtime')
  ) {
    // Add runtime export after dynamic
    content = content.replace(
      "export const dynamic = 'force-dynamic'",
      "export const dynamic = 'force-dynamic'\nexport const runtime = 'nodejs'"
    )

    writeFileSync(filePath, content)
    console.log(`✅ Added runtime config to ${route}`)
    fixed++
  }
}

console.log(`\n✨ Updated ${fixed} routes with runtime config`)
