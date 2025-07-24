#!/usr/bin/env bun

/**
 * Script to identify and handle empty TypeScript files before merging
 * This prevents empty files from overwriting actual implementations during merges
 */

import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { glob } from "glob";

interface EmptyFile {
	path: string;
	size: number;
	hasContent: boolean;
}

async function checkEmptyFiles(): Promise<EmptyFile[]> {
	console.log("🔍 Scanning for empty TypeScript files...\n");

	const patterns = ["**/*.ts", "**/*.tsx"];

	const emptyFiles: EmptyFile[] = [];

	for (const pattern of patterns) {
		const files = await glob(pattern, {
			ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/.next/**"],
		});

		for (const file of files) {
			try {
				const content = readFileSync(file, "utf-8");
				const trimmedContent = content.trim();
				const hasContent = trimmedContent.length > 0;

				if (!hasContent || trimmedContent.length < 10) {
					emptyFiles.push({
						path: file,
						size: content.length,
						hasContent: hasContent,
					});
				}
			} catch (error) {
				console.error(`Error reading ${file}:`, error);
			}
		}
	}

	return emptyFiles;
}

function categorizeEmptyFiles(emptyFiles: EmptyFile[]): {
	trulyEmpty: EmptyFile[];
	nearlyEmpty: EmptyFile[];
	critical: EmptyFile[];
} {
	const trulyEmpty = emptyFiles.filter((f) => !f.hasContent);
	const nearlyEmpty = emptyFiles.filter((f) => f.hasContent && f.size < 10);

	// Critical files that should never be empty
	const criticalPaths = [
		"middleware.ts",
		"lib/auth/",
		"lib/letta/",
		"hooks/",
		"components/",
		"app/",
	];

	const critical = emptyFiles.filter((f) => criticalPaths.some((path) => f.path.includes(path)));

	return { trulyEmpty, nearlyEmpty, critical };
}

async function handleEmptyFiles(emptyFiles: EmptyFile[], action: "list" | "remove" | "stub") {
	const { trulyEmpty, nearlyEmpty, critical } = categorizeEmptyFiles(emptyFiles);

	console.log("📊 Empty Files Analysis:");
	console.log(`   Truly empty: ${trulyEmpty.length}`);
	console.log(`   Nearly empty: ${nearlyEmpty.length}`);
	console.log(`   Critical paths: ${critical.length}\n`);

	if (critical.length > 0) {
		console.log("🚨 CRITICAL EMPTY FILES (could overwrite implementations):");
		critical.forEach((f) => {
			console.log(`   ⚠️  ${f.path} (${f.size} bytes)`);
		});
		console.log("");
	}

	if (action === "list") {
		console.log("📝 All Empty Files:");
		emptyFiles.forEach((f) => {
			const status = f.hasContent ? "nearly empty" : "empty";
			console.log(`   ${f.path} (${f.size} bytes, ${status})`);
		});
		return;
	}

	if (action === "remove") {
		console.log("🗑️  Removing truly empty files...");
		for (const file of trulyEmpty) {
			try {
				unlinkSync(file.path);
				console.log(`   ✅ Removed: ${file.path}`);
			} catch (error) {
				console.error(`   ❌ Failed to remove ${file.path}:`, error);
			}
		}
	}

	if (action === "stub") {
		console.log("📝 Creating stub implementations for critical empty files...");
		for (const file of critical) {
			if (!file.hasContent) {
				const stubContent = createStubContent(file.path);
				try {
					writeFileSync(file.path, stubContent, "utf-8");
					console.log(`   ✅ Created stub: ${file.path}`);
				} catch (error) {
					console.error(`   ❌ Failed to create stub ${file.path}:`, error);
				}
			}
		}
	}
}

function createStubContent(filePath: string): string {
	const fileName =
		filePath
			.split("/")
			.pop()
			?.replace(/\.tsx?$/, "") || "unknown";

	if (filePath.includes("middleware.ts")) {
		return `// Middleware placeholder - implement as needed
export { default } from 'next-auth/middleware';
`;
	}

	if (filePath.includes("/hooks/")) {
		return `// Hook placeholder - implement as needed
export function ${fileName}() {
  // TODO: Implement hook logic
  return {};
}
`;
	}

	if (filePath.includes("/components/")) {
		return `// Component placeholder - implement as needed
export function ${fileName}() {
  return <div>TODO: Implement ${fileName}</div>;
}
`;
	}

	if (filePath.includes("/lib/")) {
		return `// Library module placeholder - implement as needed
// TODO: Implement ${fileName} functionality

export {};
`;
	}

	return `// TODO: Implement ${fileName}
export {};
`;
}

async function main() {
	const action = (process.argv[2] as "list" | "remove" | "stub") || "list";

	console.log("🛡️  Empty Files Safety Check\n");
	console.log("━".repeat(50));

	const emptyFiles = await checkEmptyFiles();

	if (emptyFiles.length === 0) {
		console.log("✅ No empty files found!");
		return;
	}

	await handleEmptyFiles(emptyFiles, action);

	console.log(`\n📋 Summary: Found ${emptyFiles.length} empty/nearly empty files`);
	console.log('💡 Run with "stub" to create placeholder implementations');
	console.log('💡 Run with "remove" to delete truly empty files');
}

if (import.meta.main) {
	main().catch(console.error);
}
