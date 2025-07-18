#!/usr/bin/env bun
import fs from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

async function convertMockedCalls() {
  const testFiles = await glob('**/*.test.ts', { 
    ignore: ['node_modules/**', '.git/**'],
    cwd: process.cwd()
  })
  
  console.log('Found test files:', testFiles.length)
  
  let totalFiles = 0
  let totalReplacements = 0
  
  for (const file of testFiles) {
    const filePath = path.join(process.cwd(), file)
    
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      
      // Pattern to match mocked() calls
      const mockedPattern = /mocked\(([^)]+)\)/g
      
      if (mockedPattern.test(content)) {
        // Replace mocked() with type assertion
        const updatedContent = content.replace(mockedPattern, ';($1 as any)')
        
        // Count replacements
        const matches = content.match(mockedPattern)
        const replacements = matches ? matches.length : 0
        
        if (replacements > 0) {
          await fs.writeFile(filePath, updatedContent)
          console.log(`✅ ${file}: ${replacements} replacements`)
          totalFiles++
          totalReplacements += replacements
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error)
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`Files updated: ${totalFiles}`)
  console.log(`Total replacements: ${totalReplacements}`)
}

convertMockedCalls().catch(console.error)