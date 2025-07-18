#!/usr/bin/env node

/**
 * Fix Infinite Loops Script
 * Analyzes and fixes React infinite loop patterns in the codebase
 */

const fs = require('fs')
const path = require('path')

class InfiniteLoopFixer {
  constructor() {
    this.fixedFiles = []
    this.patterns = {
      // useEffect with full object dependencies
      effectFullObject: /useEffect\([^,]+,\s*\[([^[\]]*)(object|state)([^[\]]*)\]\)/g,
      // useCallback with full object dependencies
      callbackFullObject: /useCallback\([^,]+,\s*\[([^[\]]*)(options|state|props)([^[\]]*)\]\)/g,
      // useMemo with full object dependencies
      memoFullObject: /useMemo\([^,]+,\s*\[([^[\]]*)(object|state)([^[\]]*)\]\)/g,
      // setState inside useEffect without proper guards
      setStateInEffect: /useEffect\(\(\) => \{[^}]*setState[^}]*\}/g,
    }
  }

  async fixInfiniteLoops() {
    console.log('🔍 Scanning for infinite loop patterns...')

    const files = await this.findReactFiles()

    for (const file of files) {
      await this.processFile(file)
    }

    this.printSummary()
  }

  async findReactFiles() {
    const files = []

    const scanDir = (dir) => {
      const items = fs.readdirSync(dir)

      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          if (!item.startsWith('.') && item !== 'node_modules') {
            scanDir(fullPath)
          }
        } else if (item.match(/\.(tsx?|jsx?)$/)) {
          files.push(fullPath)
        }
      }
    }

    scanDir(process.cwd())
    return files
  }

  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      let modified = false
      let newContent = content

      // Check for common infinite loop patterns
      const issues = this.detectIssues(content)

      if (issues.length > 0) {
        console.log(`\n📄 ${path.relative(process.cwd(), filePath)}`)

        for (const issue of issues) {
          console.log(`  ⚠️  ${issue.type}: ${issue.description}`)

          // Apply fix if available
          if (issue.fix) {
            newContent = issue.fix(newContent)
            modified = true
          } else {
            console.log(`  💡 ${issue.suggestion}`)
          }
        }

        if (modified) {
          // Create backup
          const backupPath = `${filePath}.backup`
          fs.writeFileSync(backupPath, content)

          // Write fixed content
          fs.writeFileSync(filePath, newContent)
          this.fixedFiles.push(filePath)

          console.log(`  ✅ Fixed and backup created`)
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message)
    }
  }

  detectIssues(content) {
    const issues = []

    // Check for useEffect with object dependencies
    const effectMatches = content.match(/useEffect\([^,]+,\s*\[[^\]]*\]\)/g)
    if (effectMatches) {
      for (const match of effectMatches) {
        if (match.includes('state') || match.includes('props') || match.includes('options')) {
          issues.push({
            type: 'useEffect Dependency',
            description: 'Full object in dependency array may cause infinite loops',
            suggestion: 'Use specific object properties instead of full object',
            fix: (content) => {
              return content.replace(
                /useEffect\(([^,]+),\s*\[([^[\]]*)(state|props|options)([^[\]]*)\]\)/g,
                (match, effect, before, objName, after) => {
                  // Try to extract specific properties
                  const specificProps = this.extractObjectProps(objName, effect)
                  if (specificProps.length > 0) {
                    return `useEffect(${effect}, [${before}${specificProps.join(', ')}${after}])`
                  }
                  return match
                }
              )
            },
          })
        }
      }
    }

    // Check for useCallback with object dependencies
    const callbackMatches = content.match(/useCallback\([^,]+,\s*\[[^\]]*\]\)/g)
    if (callbackMatches) {
      for (const match of callbackMatches) {
        if (match.includes('options') || match.includes('state') || match.includes('props')) {
          issues.push({
            type: 'useCallback Dependency',
            description: 'Full object in dependency array may cause infinite recreations',
            suggestion: 'Use specific object properties or wrap in useRef',
            fix: (content) => {
              return content.replace(
                /useCallback\(([^,]+),\s*\[([^[\]]*)(options|state|props)([^[\]]*)\]\)/g,
                (match, callback, before, objName, after) => {
                  // Extract specific properties used in callback
                  const specificProps = this.extractObjectProps(objName, callback)
                  if (specificProps.length > 0) {
                    return `useCallback(${callback}, [${before}${specificProps.join(', ')}${after}])`
                  }
                  return match
                }
              )
            },
          })
        }
      }
    }

    // Check for setState inside useEffect without proper guards
    if (content.includes('setState') && content.includes('useEffect')) {
      const setStateInEffectPattern = /useEffect\(\(\) => \{[^}]*setState[^}]*\}/g
      const matches = content.match(setStateInEffectPattern)
      if (matches) {
        issues.push({
          type: 'setState in useEffect',
          description: 'setState inside useEffect may cause infinite loops',
          suggestion:
            'Add proper dependency guards or use useRef for values that shouldnt trigger re-renders',
        })
      }
    }

    return issues
  }

  extractObjectProps(objName, code) {
    const props = []

    // Common patterns to extract object properties
    const patterns = [
      new RegExp(`${objName}\\.(\\w+)`, 'g'),
      new RegExp(`${objName}\\?\\.(\\w+)`, 'g'),
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(code)) !== null) {
        const prop = match[1]
        if (!props.includes(`${objName}.${prop}`)) {
          props.push(`${objName}.${prop}`)
        }
      }
    }

    return props
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('🔧 INFINITE LOOP FIX SUMMARY')
    console.log('='.repeat(60))

    if (this.fixedFiles.length > 0) {
      console.log(`\n✅ Fixed ${this.fixedFiles.length} files:`)
      this.fixedFiles.forEach((file) => {
        console.log(`  - ${path.relative(process.cwd(), file)}`)
      })

      console.log('\n💡 Next steps:')
      console.log('  1. Test your application to ensure functionality is preserved')
      console.log('  2. Review the changes and adjust if needed')
      console.log('  3. Remove .backup files once satisfied')
      console.log('  4. Run tests to validate fixes')
    } else {
      console.log('\n✅ No automatic fixes applied')
      console.log('Manual review may be needed for complex cases')
    }
  }
}

// Run the fixer
const fixer = new InfiniteLoopFixer()
fixer.fixInfiniteLoops().catch(console.error)
