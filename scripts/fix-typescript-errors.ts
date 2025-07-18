#!/usr/bin/env bun
/**
 * Automated TypeScript Error Fixing Script
 *
 * This script uses the TypeScript Compiler API to systematically identify and fix
 * common TypeScript errors in the codebase, particularly focusing on:
 * - Missing required props in component tests
 * - Incorrect type assignments
 * - Missing imports
 * - useRef parameter issues
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { glob } from 'glob'

interface FixResult {
  file: string
  errorsBefore: number
  errorsAfter: number
  fixesApplied: string[]
}

interface ErrorPattern {
  pattern: RegExp
  fix: (match: RegExpMatchArray, content: string) => string
  description: string
}

class TypeScriptErrorFixer {
  private results: FixResult[] = []

  // Common error patterns and their fixes
  private errorPatterns: ErrorPattern[] = [
    {
      pattern: /Property '(\w+)' is missing in type '.*' but required in type '(\w+)Props'/g,
      fix: this.fixMissingProps.bind(this),
      description: 'Missing required props',
    },
    {
      pattern: /useRef<.*>\(\)/g,
      fix: this.fixUseRefParameters.bind(this),
      description: 'Missing useRef parameters',
    },
    {
      pattern: /Cannot find module '(.*)'/g,
      fix: this.fixMissingImports.bind(this),
      description: 'Missing imports',
    },
  ]

  async run(): Promise<void> {
    console.log('🔧 Starting TypeScript error fixing automation...\n')

    // Get all TypeScript files
    const files = await this.getTypeScriptFiles()
    console.log(`📁 Found ${files.length} TypeScript files to analyze\n`)

    // Get current errors
    const errorsBefore = this.getTypeScriptErrors()
    console.log(`❌ Current TypeScript errors: ${errorsBefore.length}\n`)

    // Process each file
    for (const file of files) {
      await this.processFile(file)
    }

    // Get errors after fixes
    const errorsAfter = this.getTypeScriptErrors()

    // Report results
    this.reportResults(errorsBefore.length, errorsAfter.length)
  }

  private async getTypeScriptFiles(): Promise<string[]> {
    const patterns = [
      'app/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'lib/**/*.{ts,tsx}',
      'hooks/**/*.{ts,tsx}',
      'stores/**/*.{ts,tsx}',
      'types/**/*.{ts,tsx}',
      'tests/**/*.{ts,tsx}',
      'src/**/*.{ts,tsx}',
    ]

    const allMatches = await Promise.all(
      patterns.map((pattern) => glob(pattern, { ignore: ['node_modules/**', '.next/**'] }))
    )

    const files = allMatches.flat().filter((file): file is string => typeof file === 'string')
    return [...new Set(files)] // Remove duplicates
  }

  private getTypeScriptErrors(): string[] {
    try {
      const output = execSync('bunx tsc --noEmit --listFiles 2>&1', {
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      })

      return output
        .split('\n')
        .filter((line) => line.includes('error TS'))
        .map((line) => line.trim())
    } catch (error: any) {
      // TypeScript errors are returned as non-zero exit code
      return error.stdout
        .split('\n')
        .filter((line: string) => line.includes('error TS'))
        .map((line: string) => line.trim())
    }
  }

  private async processFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8')
      let modifiedContent = content
      const fixesApplied: string[] = []

      // Apply each error pattern fix
      for (const pattern of this.errorPatterns) {
        const matches = [...content.matchAll(pattern.pattern)]
        if (matches.length > 0) {
          for (const match of matches) {
            const fixedContent = pattern.fix(match, modifiedContent)
            if (fixedContent !== modifiedContent) {
              modifiedContent = fixedContent
              fixesApplied.push(pattern.description)
            }
          }
        }
      }

      // Apply specific fixes for test files
      if (filePath.includes('.test.') || filePath.includes('.spec.')) {
        modifiedContent = this.fixTestSpecificIssues(modifiedContent, filePath)
        if (modifiedContent !== content) {
          fixesApplied.push('Test-specific fixes')
        }
      }

      // Write back if changes were made
      if (modifiedContent !== content) {
        writeFileSync(filePath, modifiedContent, 'utf-8')
        console.log(`✅ Fixed ${filePath} (${fixesApplied.join(', ')})`)
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error)
    }
  }

  private fixMissingProps(match: RegExpMatchArray, content: string): string {
    const missingProp = match[1]
    const componentType = match[2]

    // Special handling for ChatMessage component
    if (componentType === 'ChatMessage') {
      return content.replace(/<ChatMessage\s+([^>]*?)>/g, (fullMatch, props) => {
        if (!props.includes('role=')) {
          // Add default role prop
          return `<ChatMessage role="user" ${props}>`
        }
        return fullMatch
      })
    }

    return content
  }

  private fixUseRefParameters(match: RegExpMatchArray, content: string): string {
    return content.replace(/useRef<([^>]+)>\(\)/g, 'useRef<$1>(null)')
  }

  private fixMissingImports(match: RegExpMatchArray, content: string): string {
    const moduleName = match[1]

    // Common import fixes
    const importFixes: Record<string, string> = {
      '@testing-library/react': "import { render, screen } from '@testing-library/react'",
      '@testing-library/user-event': "import userEvent from '@testing-library/user-event'",
      vitest: "import { describe, it, expect, vi, beforeEach } from 'vitest'",
      react: "import React from 'react'",
    }

    if (importFixes[moduleName] && !content.includes(importFixes[moduleName])) {
      return `${importFixes[moduleName]}\n${content}`
    }

    return content
  }

  private fixTestSpecificIssues(content: string, filePath: string): string {
    let fixed = content

    // Fix ChatMessage tests specifically
    if (filePath.includes('chat-message.test.')) {
      fixed = fixed.replace(
        /<ChatMessage\s+([^>]*?)text="([^"]*)"([^>]*?)>/g,
        '<ChatMessage role="user" $1text="$2"$3>'
      )

      // Fix cases where role might be missing in other patterns
      fixed = fixed.replace(/<ChatMessage\s+(?!.*role=)([^>]*?)>/g, '<ChatMessage role="user" $1>')
    }

    // Fix authentication component tests
    if (filePath.includes('auth') && filePath.includes('.test.')) {
      // Add any missing props for auth components
      fixed = this.fixAuthComponentTests(fixed)
    }

    return fixed
  }

  private fixAuthComponentTests(content: string): string {
    // This can be expanded based on specific auth component requirements
    return content
  }

  private reportResults(errorsBefore: number, errorsAfter: number): void {
    console.log('\n📊 Automation Results:')
    console.log('='.repeat(50))
    console.log(`❌ Errors before: ${errorsBefore}`)
    console.log(`✅ Errors after:  ${errorsAfter}`)
    console.log(`🎯 Errors fixed:  ${errorsBefore - errorsAfter}`)
    console.log(
      `📈 Success rate:  ${(((errorsBefore - errorsAfter) / errorsBefore) * 100).toFixed(1)}%`
    )

    if (this.results.length > 0) {
      console.log('\n📁 Files processed:')
      this.results.forEach((result) => {
        if (result.fixesApplied.length > 0) {
          console.log(`  ✅ ${result.file}: ${result.fixesApplied.join(', ')}`)
        }
      })
    }

    if (errorsAfter > 0) {
      console.log(`\n⚠️  ${errorsAfter} errors remaining. Run the script again or fix manually.`)
    } else {
      console.log('\n🎉 All TypeScript errors have been resolved!')
    }
  }
}

// Run the fixer
if (import.meta.main) {
  const fixer = new TypeScriptErrorFixer()
  fixer.run().catch(console.error)
}

export { TypeScriptErrorFixer }
