#!/usr/bin/env bun

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { mkdirSync } from 'fs'

// Create route.config.ts files for problematic routes to skip static generation
const routes = [
  'app/api/agents/voice',
  'app/api/agents/brainstorm',
  'app/api/ai/gemini/session',
  'app/api/agents',
  'app/api/logging/client-error',
]

const routeConfig = `// Skip static generation for this route
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0
`

for (const route of routes) {
  const configPath = join(process.cwd(), route, 'route.config.ts')
  const dir = dirname(configPath)

  // Ensure directory exists
  mkdirSync(dir, { recursive: true })

  writeFileSync(configPath, routeConfig)
  console.log(`✅ Created route config for ${route}`)
}

console.log('\n✨ Route configs created successfully!')
