#!/usr/bin/env bun

/**
 * Create Bun-Compatible Mock Files
 *
 * This script creates individual mock files that work with Bun's module system
 */

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

interface MockModule {
	name: string;
	path: string;
	content: string;
}

const mockModules: MockModule[] = [
	{
		name: "next/navigation",
		path: "node_modules/next/navigation.mock.js",
		content: `
const mockRouter = {
  push: () => {},
  replace: () => {},
  prefetch: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
  pathname: '/',
  query: {},
  asPath: '/',
};

export const useRouter = () => mockRouter;
export const usePathname = () => '/';
export const useSearchParams = () => new URLSearchParams();
export const useParams = () => ({});
export const redirect = () => {};
export const notFound = () => {};
`,
	},
	{
		name: "next/link",
		path: "node_modules/next/link.mock.js",
		content: `
import React from 'react';

const Link = ({ children, href, ...props }) => {
  return React.createElement('a', { href, ...props }, children);
};

export default Link;
`,
	},
	{
		name: "next/font/google",
		path: "node_modules/next/font/google.mock.js",
		content: `
export const Inter = () => ({ 
  className: 'font-inter', 
  style: { fontFamily: 'Inter' },
  variable: '--font-inter' 
});

export const Roboto = () => ({ 
  className: 'font-roboto', 
  style: { fontFamily: 'Roboto' },
  variable: '--font-roboto'
});

export const Roboto_Mono = () => ({ 
  className: 'font-roboto-mono', 
  style: { fontFamily: 'Roboto Mono' },
  variable: '--font-roboto-mono'
});

export const Open_Sans = () => ({ 
  className: 'font-open-sans', 
  style: { fontFamily: 'Open Sans' },
  variable: '--font-open-sans'
});
`,
	},
	{
		name: "lucide-react",
		path: "node_modules/lucide-react.mock.js",
		content: `
import React from 'react';

// Create a proxy that returns mock components for any icon
const createIcon = (name) => {
  const Icon = ({ className, ...props }) => 
    React.createElement('svg', { 
      className, 
      'data-testid': \`\${name.toLowerCase()}-icon\`,
      ...props 
    });
  Icon.displayName = name;
  return Icon;
};

// Export common icons
export const Dot = createIcon('Dot');
export const Moon = createIcon('Moon');
export const Sun = createIcon('Sun');
export const Check = createIcon('Check');
export const X = createIcon('X');
export const ChevronDown = createIcon('ChevronDown');
export const ChevronUp = createIcon('ChevronUp');
export const ChevronLeft = createIcon('ChevronLeft');
export const ChevronRight = createIcon('ChevronRight');
export const Search = createIcon('Search');
export const Menu = createIcon('Menu');
export const Home = createIcon('Home');
export const Settings = createIcon('Settings');
export const User = createIcon('User');
export const LogOut = createIcon('LogOut');
export const Plus = createIcon('Plus');
export const Minus = createIcon('Minus');
export const Edit = createIcon('Edit');
export const Trash = createIcon('Trash');
export const Save = createIcon('Save');
export const Copy = createIcon('Copy');
export const Clipboard = createIcon('Clipboard');
export const Download = createIcon('Download');
export const Upload = createIcon('Upload');
export const File = createIcon('File');
export const Folder = createIcon('Folder');
export const Mail = createIcon('Mail');
export const Phone = createIcon('Phone');
export const Calendar = createIcon('Calendar');
export const Clock = createIcon('Clock');
export const Eye = createIcon('Eye');
export const EyeOff = createIcon('EyeOff');
export const Heart = createIcon('Heart');
export const Star = createIcon('Star');
export const AlertCircle = createIcon('AlertCircle');
export const Info = createIcon('Info');
export const Warning = createIcon('Warning');
export const HelpCircle = createIcon('HelpCircle');
export const Loader = createIcon('Loader');
export const RefreshCw = createIcon('RefreshCw');
export const MoreHorizontal = createIcon('MoreHorizontal');
export const MoreVertical = createIcon('MoreVertical');

// Default export that creates icons on demand
const iconHandler = {
  get(target, prop) {
    if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
      return createIcon(prop);
    }
    return undefined;
  }
};

export default new Proxy({}, iconHandler);
`,
	},
];

async function createMockFile(mock: MockModule) {
	const fullPath = join(process.cwd(), mock.path);
	const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

	try {
		await mkdir(dir, { recursive: true });
		await writeFile(fullPath, mock.content.trim());
		console.log(`✅ Created mock: ${mock.path}`);
	} catch (error) {
		console.error(`❌ Failed to create mock ${mock.name}:`, error);
	}
}

async function createBunConfig() {
	const bunConfig = `
import { plugin } from "bun";

// Mock resolver plugin for Bun
plugin({
  name: "mock-resolver",
  setup(build) {
    // Intercept imports and redirect to mocks
    build.onResolve({ filter: /^next\\/navigation$/ }, () => {
      return { path: "./node_modules/next/navigation.mock.js" };
    });
    
    build.onResolve({ filter: /^next\\/link$/ }, () => {
      return { path: "./node_modules/next/link.mock.js" };
    });
    
    build.onResolve({ filter: /^next\\/font\\/google$/ }, () => {
      return { path: "./node_modules/next/font/google.mock.js" };
    });
    
    build.onResolve({ filter: /^lucide-react$/ }, () => {
      return { path: "./node_modules/lucide-react.mock.js" };
    });
  }
});
`;

	await writeFile(join(process.cwd(), "bun.mock.config.js"), bunConfig.trim());
	console.log("✅ Created Bun mock configuration");
}

async function updatePackageJson() {
	const packageJsonPath = join(process.cwd(), "package.json");
	try {
		const packageJson = await Bun.file(packageJsonPath).json();

		// Add test script that uses the mock config
		packageJson.scripts = packageJson.scripts || {};
		packageJson.scripts["test:bun"] = "bun test --preload ./bun.mock.config.js";
		packageJson.scripts["test:vitest:bun"] = "vitest run --config vitest.config.bun.ts";

		await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
		console.log("✅ Updated package.json with Bun test scripts");
	} catch (error) {
		console.error("❌ Failed to update package.json:", error);
	}
}

async function main() {
	console.log("🔧 Creating Bun-Compatible Mock Files");
	console.log("====================================\n");

	// Create all mock files
	for (const mock of mockModules) {
		await createMockFile(mock);
	}

	// Create Bun configuration
	await createBunConfig();

	// Update package.json
	await updatePackageJson();

	console.log("\n✨ Setup complete!");
	console.log("\n📋 Usage:");
	console.log("1. Run tests with: bun test:bun");
	console.log("2. Or use Vitest: bun test:vitest:bun");
	console.log("3. Mock files are in node_modules/*.mock.js");
}

main().catch(console.error);
