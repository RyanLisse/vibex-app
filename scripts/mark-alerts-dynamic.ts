#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { join } from 'path'

// Find all alert API routes
const routes = glob.sync('app/api/alerts/**/route.ts', { cwd: process.cwd() })

const dynamicExport = `// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

`

let updated = 0

for (const route of routes) {
  const filePath = join(process.cwd(), route)
  let content = readFileSync(filePath, 'utf-8')

  // Check if already has dynamic export
  if (!content.includes('export const dynamic')) {
    // Add at the beginning
    content = dynamicExport + content

    writeFileSync(filePath, content)
    console.log(`✅ Marked ${route} as dynamic`)
    updated++
  }
}

console.log(`\n✨ Updated ${updated} alert routes to force dynamic rendering`)
