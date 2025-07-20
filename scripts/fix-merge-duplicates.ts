#!/usr/bin/env bun
import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

/**
 * Fix duplicate code sections from merge conflicts
 */

async function fixDuplicateExports(content: string): Promise<string> {
  // Remove duplicate export statements
  const lines = content.split('\n');
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for duplicate exports
    if (line.match(/^export\s+(const|function|class|interface|type)\s+\w+/)) {
      const exportMatch = line.match(/^export\s+(?:const|function|class|interface|type)\s+(\w+)/);
      if (exportMatch) {
        const exportName = exportMatch[1];
        if (seen.has(exportName)) {
          // Skip duplicate export
          continue;
        }
        seen.add(exportName);
      }
    }
    
    result.push(line);
  }
  
  return result.join('\n');
}

async function fixDuplicateImports(content: string): Promise<string> {
  // Remove duplicate import statements
  const lines = content.split('\n');
  const importGroups = new Map<string, string>();
  const result: string[] = [];
  let inImportBlock = false;
  
  for (const line of lines) {
    if (line.match(/^import\s+/)) {
      inImportBlock = true;
      const fromMatch = line.match(/from\s+['"]([^'"]+)['"]/);
      if (fromMatch) {
        const fromPath = fromMatch[1];
        if (!importGroups.has(fromPath)) {
          importGroups.set(fromPath, line);
          result.push(line);
        }
      }
    } else if (inImportBlock && line.trim() === '') {
      inImportBlock = false;
      result.push(line);
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

async function fixDuplicateDescribeBlocks(content: string): Promise<string> {
  // Fix duplicate describe blocks in test files
  const lines = content.split('\n');
  const result: string[] = [];
  let skipNext = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    
    const line = lines[i];
    const nextLine = lines[i + 1];
    
    // Check for duplicate describe blocks
    if (line.match(/^describe\(['"`]/) && nextLine?.match(/^describe\(['"`]/)) {
      // Keep only the first one
      result.push(line);
      skipNext = true;
    } else if (line.match(/^\s*beforeEach\(/) && nextLine?.match(/^\s*beforeEach\(/)) {
      // Keep only the first beforeEach
      result.push(line);
      skipNext = true;
    } else {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

async function processFile(filePath: string): Promise<void> {
  try {
    let content = await readFile(filePath, 'utf-8');
    const originalContent = content;
    
    // Apply fixes
    content = await fixDuplicateExports(content);
    content = await fixDuplicateImports(content);
    
    // Fix test files
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      content = await fixDuplicateDescribeBlocks(content);
    }
    
    // Only write if content changed
    if (content !== originalContent) {
      await writeFile(filePath, content);
      console.log(`✅ Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other build directories
        if (!['node_modules', '.next', 'coverage', 'dist', '.git'].includes(entry.name)) {
          await walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await walk(dir);
  return files;
}

async function main() {
  console.log('🔧 Fixing duplicate code from merge conflicts...');
  
  const projectRoot = process.cwd();
  const files = await findFiles(projectRoot, ['.ts', '.tsx']);
  
  console.log(`Found ${files.length} TypeScript files to process`);
  
  // Process files in parallel batches
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(batch.map(processFile));
  }
  
  console.log('✨ Done!');
}

main().catch(console.error);