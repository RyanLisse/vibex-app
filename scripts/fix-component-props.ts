#!/usr/bin/env bun
/**
 * Component Prop Type and Module Export Fixer
 *
 * This script automatically fixes:
 * - Authentication component prop type mismatches
 * - Missing module exports in test utilities
 * - Barrel export issues in index.ts files
 */

import { execSync } from 'child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { basename, dirname, join } from 'path'

interface ComponentPropFix {
  component: string
  propsInterface: string
  testFile: string
  fixes: string[]
}

class ComponentPropFixer {
  private authComponents = [
    'AnthropicAuthCard',
    'OpenAIAuthCard',
    'AnthropicAuthStatus',
    'OpenAIAuthStatus',
  ]

  async run(): Promise<void> {
    console.log('🔧 Fixing component prop types and module exports...\n')

    // Fix authentication component prop types
    await this.fixAuthComponentProps()

    // Fix missing module exports
    await this.fixMissingExports()

    // Create/update barrel exports
    await this.createBarrelExports()

    // Verify fixes
    await this.verifyFixes()
  }

  private async fixAuthComponentProps(): Promise<void> {
    console.log('🔨 Fixing authentication component prop types...')

    for (const component of this.authComponents) {
      await this.fixComponentPropTypes(component)
    }
  }

  private async fixComponentPropTypes(componentName: string): Promise<void> {
    // Find component file
    const componentFiles = await glob(
      `**/${componentName
        .toLowerCase()
        .replace(/([A-Z])/g, '-$1')
        .slice(1)}.{ts,tsx}`,
      {
        ignore: ['node_modules/**', '.next/**'],
      }
    )

    // Find test file
    const testFiles = await glob(
      `**/${componentName
        .toLowerCase()
        .replace(/([A-Z])/g, '-$1')
        .slice(1)}.test.{ts,tsx}`,
      {
        ignore: ['node_modules/**', '.next/**'],
      }
    )

    if (componentFiles.length === 0 || testFiles.length === 0) {
      console.log(`⚠️  Could not find files for ${componentName}`)
      return
    }

    const componentFile = componentFiles[0]
    const testFile = testFiles[0]

    // Ensure we have valid file paths
    if (typeof componentFile !== 'string' || typeof testFile !== 'string') {
      console.log(`⚠️  Invalid file paths for ${componentName}`)
      return
    }

    // Analyze component props
    const componentContent = readFileSync(componentFile, 'utf-8')
    const propsInterface = this.extractPropsInterface(componentContent, componentName)

    // Fix test file
    await this.fixTestFileProps(testFile, componentName, propsInterface)

    console.log(`✅ Fixed ${componentName} prop types`)
  }

  private extractPropsInterface(content: string, componentName: string): Record<string, string> {
    const props: Record<string, string> = {}

    // Look for interface definition
    const interfaceMatch = content.match(
      new RegExp(`interface\\s+${componentName}Props\\s*{([^}]+)}`, 's')
    )
    if (interfaceMatch) {
      const interfaceBody = interfaceMatch[1]
      const propMatches = interfaceBody.matchAll(/(\w+)(\?)?:\s*([^;\n]+)/g)

      for (const match of propMatches) {
        const [, propName, optional, propType] = match
        props[propName] = propType.trim()
      }
    }

    // Look for function parameters if no interface found
    if (Object.keys(props).length === 0) {
      const functionMatch = content.match(
        new RegExp(`function\\s+${componentName}\\s*\\(\\s*{([^}]+)}`, 's')
      )
      if (functionMatch) {
        const params = functionMatch[1]
        const paramMatches = params.matchAll(/(\w+)(\?)?/g)

        for (const match of paramMatches) {
          const [, propName] = match
          props[propName] = 'any' // Default type
        }
      }
    }

    return props
  }

  private async fixTestFileProps(
    testFile: string,
    componentName: string,
    propsInterface: Record<string, string>
  ): Promise<void> {
    if (!testFile || typeof testFile !== 'string') {
      console.warn(`⚠️ Invalid test file path: ${testFile}`)
      return
    }

    try {
      let content = readFileSync(testFile, 'utf-8')

      // Add missing props to component renders
      const componentRegex = new RegExp(`<${componentName}([^>]*?)>`, 'g')

      content = content.replace(componentRegex, (match, existingProps) => {
        const missingProps: string[] = []

        // Check for required props
        for (const [propName, propType] of Object.entries(propsInterface)) {
          if (!existingProps.includes(`${propName}=`)) {
            // Add default values based on type
            const defaultValue = this.getDefaultPropValue(propType)
            if (defaultValue) {
              missingProps.push(`${propName}=${defaultValue}`)
            }
          }
        }

        if (missingProps.length > 0) {
          const newProps = existingProps.trim()
            ? `${existingProps} ${missingProps.join(' ')}`
            : missingProps.join(' ')
          return `<${componentName} ${newProps}>`
        }

        return match
      })

      writeFileSync(testFile, content, 'utf-8')
    } catch (error) {
      console.error(`❌ Error fixing test file ${testFile}:`, error)
    }
  }

  private getDefaultPropValue(propType: string): string | null {
    const type = propType.toLowerCase()

    if (type.includes('string')) return '"test"'
    if (type.includes('number')) return '{42}'
    if (type.includes('boolean')) return '{true}'
    if (type.includes('function') || type.includes('=>')) return '{vi.fn()}'
    if (type.includes('object')) return '{{}}'
    if (type.includes('array')) return '{[]}'
    if (type.includes('date')) return '{new Date()}'

    return null
  }

  private async fixMissingExports(): Promise<void> {
    console.log('🔨 Fixing missing module exports...')

    const testDirs = ['tests', 'src/test', 'test']

    for (const dir of testDirs) {
      if (existsSync(dir)) {
        await this.fixDirectoryExports(dir)
      }
    }
  }

  private async fixDirectoryExports(dirPath: string): Promise<void> {
    const files = readdirSync(dirPath)

    for (const file of files) {
      const fullPath = join(dirPath, file)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        await this.fixDirectoryExports(fullPath)
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        await this.ensureProperExports(fullPath)
      }
    }
  }

  private async ensureProperExports(filePath: string): Promise<void> {
    const content = readFileSync(filePath, 'utf-8')

    // Check if file has exports
    const hasExports = content.includes('export ') || content.includes('export default')

    if (!(hasExports || filePath.includes('.test.') || filePath.includes('.spec.'))) {
      // Add default export for utility files
      const fileName = basename(filePath, '.ts').replace('.tsx', '')
      const exportName = fileName.charAt(0).toUpperCase() + fileName.slice(1)

      // Simple heuristic: if file has functions, export them
      const functionMatches = content.match(/(?:function|const|let|var)\s+(\w+)/g)
      if (functionMatches && functionMatches.length > 0) {
        const exports = functionMatches
          .map((match) => match.split(/\s+/)[1])
          .filter((name) => name && !name.includes('('))

        if (exports.length > 0) {
          const exportStatement = `\n\nexport { ${exports.join(', ')} }\n`
          writeFileSync(filePath, content + exportStatement, 'utf-8')
          console.log(`✅ Added exports to ${filePath}`)
        }
      }
    }
  }

  private async createBarrelExports(): Promise<void> {
    console.log('🔨 Creating barrel exports...')

    const directories = ['tests', 'tests/mocks', 'tests/fixtures', 'tests/helpers', 'src/test']

    for (const dir of directories) {
      if (existsSync(dir)) {
        await this.createIndexFile(dir)
      }
    }
  }

  private async createIndexFile(dirPath: string): Promise<void> {
    const indexPath = join(dirPath, 'index.ts')
    const files = readdirSync(dirPath)

    const exports: string[] = []

    for (const file of files) {
      const fullPath = join(dirPath, file)
      const stat = statSync(fullPath)

      if (
        stat.isFile() &&
        (file.endsWith('.ts') || file.endsWith('.tsx')) &&
        file !== 'index.ts' &&
        !file.includes('.test.') &&
        !file.includes('.spec.')
      ) {
        const fileName = file.replace(/\.(ts|tsx)$/, '')
        exports.push(`export * from './${fileName}'`)
      }
    }

    if (exports.length > 0) {
      const content = `// Auto-generated barrel export file\n// This file exports all utilities from this directory\n\n${exports.join('\n')}\n`
      writeFileSync(indexPath, content, 'utf-8')
      console.log(`✅ Created barrel export: ${indexPath}`)
    }
  }

  private async verifyFixes(): Promise<void> {
    console.log('\n🧪 Verifying component prop fixes...')

    try {
      // Check TypeScript compilation for auth components
      const authErrors = execSync(
        'bunx tsc --noEmit 2>&1 | grep -i "auth" || echo "No auth errors"',
        {
          encoding: 'utf-8',
        }
      )

      if (authErrors.includes('No auth errors')) {
        console.log('✅ Authentication component prop types appear to be fixed!')
      } else {
        console.log('⚠️  Some authentication component issues remain:')
        console.log(authErrors)
      }

      // Check for missing exports
      const exportErrors = execSync(
        'bunx tsc --noEmit 2>&1 | grep -i "cannot find module" || echo "No export errors"',
        {
          encoding: 'utf-8',
        }
      )

      if (exportErrors.includes('No export errors')) {
        console.log('✅ Module exports appear to be working!')
      } else {
        console.log('⚠️  Some module export issues remain:')
        console.log(exportErrors)
      }
    } catch (error) {
      console.log('⚠️  Could not verify fixes automatically. Please test manually.')
    }
  }
}

// Run the fixer
if (import.meta.main) {
  const fixer = new ComponentPropFixer()
  fixer.run().catch(console.error)
}

export { ComponentPropFixer }
