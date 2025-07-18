#!/usr/bin/env bun
/**
 * Fix Import Paths Script
 *
 * This script automatically fixes import path issues by:
 * 1. Updating relative imports to use path aliases
 * 2. Fixing incorrect path aliases
 * 3. Ensuring consistent import paths across the codebase
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { dirname, join, relative } from 'path'

interface ImportFix {
  file: string
  original: string
  fixed: string
  line: number
}

class ImportPathFixer {
  private fixes: ImportFix[] = []
  private fileCount = 0
  private fixCount = 0

  async run(): Promise<void> {
    console.log('🔧 Starting import path fixing automation...\n')

    // Process all TypeScript and JavaScript files
    const files = this.getAllFiles('.', ['.ts', '.tsx', '.js', '.jsx'])
    console.log(`📁 Found ${files.length} files to analyze\n`)

    for (const file of files) {
      await this.fixFileImports(file)
    }

    // Apply all fixes
    await this.applyFixes()

    // Report results
    this.reportResults()
  }

  private getAllFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = []

    const processDir = (currentDir: string) => {
      // Skip directories
      if (
        currentDir.includes('node_modules') ||
        currentDir.includes('.next') ||
        currentDir.includes('dist') ||
        currentDir.includes('coverage') ||
        currentDir.includes('.git')
      ) {
        return
      }

      try {
        const items = readdirSync(currentDir)

        for (const item of items) {
          const fullPath = join(currentDir, item)
          const stat = statSync(fullPath)

          if (stat.isDirectory()) {
            processDir(fullPath)
          } else if (extensions.some((ext) => item.endsWith(ext))) {
            files.push(fullPath)
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    processDir(dir)
    return files
  }

  private async fixFileImports(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      let hasChanges = false

      const fixedLines = lines.map((line, index) => {
        // Match import/export statements
        const importMatch = line.match(
          /^(import|export)(\s+type)?(\s+\{[^}]+\}|\s+\*\s+as\s+\w+|\s+\w+)?\s+from\s+['"]([^'"]+)['"]/
        )

        if (importMatch) {
          const originalPath = importMatch[4]
          const fixedPath = this.fixImportPath(originalPath, filePath)

          if (originalPath !== fixedPath) {
            this.fixes.push({
              file: filePath,
              original: originalPath,
              fixed: fixedPath,
              line: index + 1,
            })
            hasChanges = true
            return line.replace(originalPath, fixedPath)
          }
        }

        // Match dynamic imports
        const dynamicMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/)
        if (dynamicMatch) {
          const originalPath = dynamicMatch[1]
          const fixedPath = this.fixImportPath(originalPath, filePath)

          if (originalPath !== fixedPath) {
            this.fixes.push({
              file: filePath,
              original: originalPath,
              fixed: fixedPath,
              line: index + 1,
            })
            hasChanges = true
            return line.replace(originalPath, fixedPath)
          }
        }

        return line
      })

      if (hasChanges) {
        this.fileCount++
        writeFileSync(filePath, fixedLines.join('\n'), 'utf-8')
      }
    } catch (error) {
      console.warn(`⚠️  Could not process ${filePath}:`, error)
    }
  }

  private fixImportPath(importPath: string, fromFile: string): string {
    // Skip external modules and already correct paths
    if (!(importPath.startsWith('.') || importPath.startsWith('/'))) {
      return importPath
    }

    // Fix absolute imports that should use aliases
    if (importPath.startsWith('/')) {
      if (importPath.startsWith('/components')) return '@/components' + importPath.slice(11)
      if (importPath.startsWith('/lib')) return '@/lib' + importPath.slice(4)
      if (importPath.startsWith('/hooks')) return '@/hooks' + importPath.slice(6)
      if (importPath.startsWith('/stores')) return '@/stores' + importPath.slice(7)
      if (importPath.startsWith('/types')) return '@/types' + importPath.slice(6)
      if (importPath.startsWith('/app')) return '@/app' + importPath.slice(4)
      return '@' + importPath
    }

    // Convert relative imports to aliases where appropriate
    const fromDir = dirname(fromFile)
    const resolvedPath = join(fromDir, importPath)
    const normalizedPath = resolvedPath.replace(/\\/g, '/')

    // Determine the appropriate alias
    if (normalizedPath.startsWith('components/')) {
      this.fixCount++
      return '@/components/' + normalizedPath.slice(11).replace(/\.(ts|tsx|js|jsx)$/, '')
    }
    if (normalizedPath.startsWith('lib/')) {
      this.fixCount++
      return '@/lib/' + normalizedPath.slice(4).replace(/\.(ts|tsx|js|jsx)$/, '')
    }
    if (normalizedPath.startsWith('hooks/')) {
      this.fixCount++
      return '@/hooks/' + normalizedPath.slice(6).replace(/\.(ts|tsx|js|jsx)$/, '')
    }
    if (normalizedPath.startsWith('stores/')) {
      this.fixCount++
      return '@/stores/' + normalizedPath.slice(7).replace(/\.(ts|tsx|js|jsx)$/, '')
    }
    if (normalizedPath.startsWith('types/')) {
      this.fixCount++
      return '@/types/' + normalizedPath.slice(6).replace(/\.(ts|tsx|js|jsx)$/, '')
    }
    if (normalizedPath.startsWith('app/')) {
      this.fixCount++
      return '@/app/' + normalizedPath.slice(4).replace(/\.(ts|tsx|js|jsx)$/, '')
    }
    if (normalizedPath.startsWith('src/')) {
      this.fixCount++
      return '@/src/' + normalizedPath.slice(4).replace(/\.(ts|tsx|js|jsx)$/, '')
    }
    if (normalizedPath.startsWith('tests/')) {
      this.fixCount++
      return '@/test/' + normalizedPath.slice(6).replace(/\.(ts|tsx|js|jsx)$/, '')
    }

    // Keep relative imports for local files in the same directory
    return importPath
  }

  private async applyFixes(): Promise<void> {
    // Fixes are already applied in fixFileImports
    console.log(`✅ Applied ${this.fixCount} import fixes across ${this.fileCount} files\n`)
  }

  private reportResults(): void {
    console.log('\n📊 Import Fix Results:')
    console.log('==================================================')
    console.log(
      `📁 Files analyzed: ${this.getAllFiles('.', ['.ts', '.tsx', '.js', '.jsx']).length}`
    )
    console.log(`✏️  Files modified: ${this.fileCount}`)
    console.log(`🔧 Imports fixed:  ${this.fixCount}`)

    if (this.fixes.length > 0) {
      console.log('\n📋 Sample Fixes (first 10):')
      this.fixes.slice(0, 10).forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix.file}:${fix.line}`)
        console.log(`      ${fix.original} → ${fix.fixed}`)
      })

      if (this.fixes.length > 10) {
        console.log(`   ... and ${this.fixes.length - 10} more fixes`)
      }
    }

    console.log('\n✅ Import path fixing completed!')
    console.log('🔧 Run "bun run type-check" to verify all imports are resolved')
  }
}

// Run the import fixer
if (import.meta.main) {
  const fixer = new ImportPathFixer()
  fixer.run().catch(console.error)
}

export { ImportPathFixer }
