#!/usr/bin/env bun

/**
 * Final Comprehensive Mock Implementation Fix
 *
 * This script provides the ultimate solution for fixing all mock issues
 * and making tests compatible with Vitest and Bun.
 */

import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

// Enhanced mock implementations with proper types
const MOCK_IMPLEMENTATIONS = {
	"next/navigation": `(() => ({
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    })),
    usePathname: vi.fn(() => '/'),
    useSearchParams: vi.fn(() => new URLSearchParams()),
    useParams: vi.fn(() => ({})),
    redirect: vi.fn(),
    notFound: vi.fn(),
    useSelectedLayoutSegment: vi.fn(),
    useSelectedLayoutSegments: vi.fn(() => []),
  }))`,

	"next/link": `(() => {
    const React = require('react');
    return {
      __esModule: true,
      default: vi.fn(({ children, href, ...props }) => 
        React.createElement('a', { href, ...props }, children)
      )
    };
  })`,

	"next/font/google": `(() => ({
    Inter: vi.fn(() => ({ 
      className: 'font-inter', 
      style: { fontFamily: 'Inter' },
      variable: '--font-inter' 
    })),
    Roboto: vi.fn(() => ({ 
      className: 'font-roboto', 
      style: { fontFamily: 'Roboto' },
      variable: '--font-roboto'
    })),
    Roboto_Mono: vi.fn(() => ({ 
      className: 'font-roboto-mono', 
      style: { fontFamily: 'Roboto Mono' },
      variable: '--font-roboto-mono'
    })),
  }))`,

	"lucide-react": `(() => {
    const React = require('react');
    const createIcon = (name) => {
      const component = ({ className, ...props }) => 
        React.createElement('svg', { 
          className, 
          'data-testid': \`\${name.toLowerCase()}-icon\`,
          ...props 
        });
      component.displayName = name;
      return vi.fn(component);
    };
    
    return new Proxy({}, {
      get(target, prop) {
        if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
          return createIcon(prop);
        }
        return undefined;
      }
    });
  })`,

	"@radix-ui/react-dialog": `(() => ({
    Root: vi.fn(({ children, ...props }) => 
      React.createElement('div', { 'data-testid': 'dialog-root', ...props }, children)
    ),
    Trigger: vi.fn(({ children, ...props }) => 
      React.createElement('button', { 'data-testid': 'dialog-trigger', ...props }, children)
    ),
    Portal: vi.fn(({ children }) => children),
    Overlay: vi.fn(({ children, className, ...props }) => 
      React.createElement('div', { className, 'data-testid': 'dialog-overlay', ...props }, children)
    ),
    Content: vi.fn(({ children, className, ...props }) => 
      React.createElement('div', { className, 'data-testid': 'dialog-content', ...props }, children)
    ),
    Title: vi.fn(({ children, className, ...props }) => 
      React.createElement('h2', { className, 'data-testid': 'dialog-title', ...props }, children)
    ),
    Description: vi.fn(({ children, className, ...props }) => 
      React.createElement('p', { className, 'data-testid': 'dialog-description', ...props }, children)
    ),
    Close: vi.fn(({ children, ...props }) => 
      React.createElement('button', { 'data-testid': 'dialog-close', ...props }, children)
    ),
  }))`,

	"@radix-ui/react-label": `(() => ({
    Root: vi.fn(({ children, className, ...props }) => 
      React.createElement('label', { className, 'data-testid': 'label-root', ...props }, children)
    ),
  }))`,

	"@radix-ui/react-select": `(() => ({
    Root: vi.fn(({ children, ...props }) => 
      React.createElement('div', { 'data-testid': 'select-root', ...props }, children)
    ),
    Trigger: vi.fn(({ children, className, ...props }) => 
      React.createElement('button', { className, 'data-testid': 'select-trigger', ...props }, children)
    ),
    Value: vi.fn(({ children, placeholder, ...props }) => 
      React.createElement('span', { 'data-testid': 'select-value', ...props }, children || placeholder)
    ),
    Icon: vi.fn(({ children, ...props }) => 
      React.createElement('span', { 'data-testid': 'select-icon', ...props }, children)
    ),
    Portal: vi.fn(({ children }) => children),
    Content: vi.fn(({ children, className, ...props }) => 
      React.createElement('div', { className, 'data-testid': 'select-content', ...props }, children)
    ),
    Item: vi.fn(({ children, value, ...props }) => 
      React.createElement('div', { 'data-testid': 'select-item', 'data-value': value, ...props }, children)
    ),
    ItemText: vi.fn(({ children }) => children),
    ItemIndicator: vi.fn(({ children, ...props }) => 
      React.createElement('span', { 'data-testid': 'select-item-indicator', ...props }, children)
    ),
    Group: vi.fn(({ children, ...props }) => 
      React.createElement('div', { 'data-testid': 'select-group', ...props }, children)
    ),
    Label: vi.fn(({ children, ...props }) => 
      React.createElement('div', { 'data-testid': 'select-label', ...props }, children)
    ),
    Separator: vi.fn(() => 
      React.createElement('hr', { 'data-testid': 'select-separator' })
    ),
    ScrollUpButton: vi.fn(({ children, ...props }) => 
      React.createElement('button', { 'data-testid': 'select-scroll-up', ...props }, children)
    ),
    ScrollDownButton: vi.fn(({ children, ...props }) => 
      React.createElement('button', { 'data-testid': 'select-scroll-down', ...props }, children)
    ),
    Viewport: vi.fn(({ children, ...props }) => 
      React.createElement('div', { 'data-testid': 'select-viewport', ...props }, children)
    ),
  }))`,

	"next-themes": `(() => ({
    useTheme: vi.fn(() => ({
      theme: 'light',
      setTheme: vi.fn(),
      resolvedTheme: 'light',
      themes: ['light', 'dark'],
      systemTheme: 'light',
    })),
    ThemeProvider: vi.fn(({ children }) => children),
  }))`,
};

async function findTestFiles(dir: string): Promise<string[]> {
	const files: string[] = [];

	async function walk(currentDir: string) {
		try {
			const entries = await readdir(currentDir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = join(currentDir, entry.name);

				if (
					entry.isDirectory() &&
					!entry.name.startsWith(".") &&
					!["node_modules", "dist", ".next", "coverage"].includes(entry.name)
				) {
					await walk(fullPath);
				} else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
					files.push(fullPath);
				}
			}
		} catch (err) {
			// Skip inaccessible directories
		}
	}

	await walk(dir);
	return files;
}

function getImplementation(moduleName: string, existingImpl?: string): string {
	// Check if we have a predefined implementation
	if (MOCK_IMPLEMENTATIONS[moduleName]) {
		return MOCK_IMPLEMENTATIONS[moduleName];
	}

	// If an implementation was provided in the file, try to use it
	if (existingImpl) {
		// Wrap it in a function if it's not already
		if (!existingImpl.trim().startsWith("(")) {
			return `(() => (${existingImpl}))`;
		}
		return existingImpl;
	}

	// Generate a generic mock based on the module type
	if (moduleName.includes(".css") || moduleName.includes(".scss")) {
		return "(() => ({}))";
	}

	if (moduleName.startsWith("@/components/") || moduleName.includes("/ui/")) {
		return `(() => {
      const React = require('react');
      return {
        default: vi.fn(() => React.createElement('div', { 'data-testid': '${basename(moduleName)}' }, 'Mock ${basename(moduleName)}')),
        ${basename(moduleName).replace(/[^a-zA-Z0-9]/g, "")}: vi.fn(() => React.createElement('div', { 'data-testid': '${basename(moduleName)}' }, 'Mock ${basename(moduleName)}')),
      };
    })`;
	}

	// Default mock
	return `(() => ({
    default: vi.fn(),
    ...jest.requireActual('${moduleName}'),
  }))`;
}

function transformContent(content: string, filePath: string): string {
	let transformed = content;
	const isReactFile = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");

	// Extract all vi.mock calls with their implementations
	const mockCalls: Array<{ module: string; impl?: string }> = [];

	// Pattern for vi.mock with implementation
	const mockWithImplRegex = /vi\.mock\(['"]([^'"]+)['"]\s*,\s*\(\)\s*=>\s*(\{[\s\S]*?\})\)/gm;
	let match;

	while ((match = mockWithImplRegex.exec(content)) !== null) {
		mockCalls.push({ module: match[1], impl: match[2] });
	}

	// Pattern for vi.mock without implementation
	const simpleMockRegex = /vi\.mock\(['"]([^'"]+)['"]\)/gm;

	while ((match = simpleMockRegex.exec(content)) !== null) {
		if (!mockCalls.find((m) => m.module === match[1])) {
			mockCalls.push({ module: match[1] });
		}
	}

	// Remove all vi.mock calls
	transformed = transformed.replace(
		/vi\.mock\(['"][^'"]+['"]\s*(?:,\s*\(\)\s*=>\s*\{[\s\S]*?\})?\);?\s*/gm,
		""
	);

	// Replace vi methods with jest
	transformed = transformed.replace(/\bvi\./g, "jest.");
	transformed = transformed.replace(/\bmock\./g, "jest.");

	// Add jest.mock calls
	const jestMockCalls: string[] = [];
	let needsReact = false;

	for (const { module, impl } of mockCalls) {
		const implementation = getImplementation(module, impl);

		// Check if implementation uses React
		if (implementation.includes("React.")) {
			needsReact = true;
		}

		// Skip CSS mocks as they're handled automatically
		if (!module.endsWith(".css") && !module.endsWith(".scss")) {
			jestMockCalls.push(`jest.mock('${module}', ${implementation});`);
		}
	}

	// Update imports
	const hasJest = transformed.includes("jest.");
	const vitestImportMatch = transformed.match(/import\s*\{([^}]+)\}\s*from\s*["']vitest["']/);

	if (hasJest && vitestImportMatch) {
		const imports = vitestImportMatch[1].split(",").map((i) => i.trim());

		// Add jest if not present
		if (!imports.includes("jest")) {
			imports.push("jest");
		}

		// Remove vi if no longer used
		const viIndex = imports.indexOf("vi");
		if (viIndex > -1 && !transformed.includes("vi.")) {
			imports.splice(viIndex, 1);
		}

		transformed = transformed.replace(
			vitestImportMatch[0],
			`import { ${imports.join(", ")} } from "vitest"`
		);
	} else if (hasJest && !vitestImportMatch) {
		// Add vitest import with jest
		const firstImportMatch = transformed.match(/^import\s+.*$/m);
		if (firstImportMatch) {
			transformed = transformed.replace(
				firstImportMatch[0],
				`import { jest } from "vitest";\n${firstImportMatch[0]}`
			);
		} else {
			transformed = `import { jest } from "vitest";\n${transformed}`;
		}
	}

	// Add React import if needed
	if (
		needsReact &&
		isReactFile &&
		!transformed.includes("import React") &&
		!transformed.includes("import * as React")
	) {
		const firstImportMatch = transformed.match(/^import\s+.*$/m);
		if (firstImportMatch) {
			transformed = transformed.replace(
				firstImportMatch[0],
				`import React from "react";\n${firstImportMatch[0]}`
			);
		} else {
			transformed = `import React from "react";\n${transformed}`;
		}
	}

	// Insert jest.mock calls after imports
	if (jestMockCalls.length > 0) {
		const importsEndMatch = transformed.match(
			/^((?:import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*\n?)*)/m
		);
		if (importsEndMatch) {
			const insertPosition = importsEndMatch[0].length;
			transformed =
				transformed.slice(0, insertPosition) +
				"\n" +
				jestMockCalls.join("\n") +
				"\n\n" +
				transformed.slice(insertPosition);
		} else {
			transformed = jestMockCalls.join("\n") + "\n\n" + transformed;
		}
	}

	return transformed;
}

async function processTestFile(filePath: string): Promise<boolean> {
	try {
		const content = await readFile(filePath, "utf-8");

		// Skip if no vi usage
		if (!content.includes("vi.")) {
			return false;
		}

		const transformed = transformContent(content, filePath);

		if (transformed !== content) {
			await writeFile(filePath, transformed);
			console.log(`✅ Fixed: ${filePath}`);
			return true;
		}

		return false;
	} catch (error) {
		console.error(`❌ Error processing ${filePath}:`, error);
		return false;
	}
}

async function main() {
	console.log("🚀 Final Comprehensive Vi.Mock Fix");
	console.log("=================================\n");

	console.log("🔎 Searching for test files...");
	const testFiles = await findTestFiles(process.cwd());
	console.log(`Found ${testFiles.length} test files\n`);

	let fixedCount = 0;
	let processedCount = 0;

	for (const file of testFiles) {
		processedCount++;
		if (processedCount % 50 === 0) {
			console.log(`Progress: ${processedCount}/${testFiles.length} files...`);
		}

		if (await processTestFile(file)) {
			fixedCount++;
		}
	}

	console.log("\n✨ Results:");
	console.log(`   - Scanned: ${testFiles.length} test files`);
	console.log(`   - Fixed: ${fixedCount} files`);
	console.log("   - Replaced all vi.mock with jest.mock");
	console.log("   - Added proper mock implementations");

	console.log("\n📋 Next Steps:");
	console.log("1. Run: bun test");
	console.log("2. Or: bunx vitest run");
	console.log("3. Check for any remaining issues");

	console.log("\n💡 Tips:");
	console.log("- All vi.* methods have been replaced with jest.*");
	console.log("- Mock implementations are now inline");
	console.log("- CSS imports are automatically handled");
}

main().catch(console.error);
