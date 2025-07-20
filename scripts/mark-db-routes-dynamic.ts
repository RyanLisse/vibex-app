#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";

const DB_DEPENDENT_PATHS = [
	"app/api/agent-memory/**/*.ts",
	"app/api/tasks/**/*.ts",
	"app/api/workflows/**/*.ts",
	"app/api/environments/**/*.ts",
	"app/api/users/**/*.ts",
	"app/api/observability/**/*.ts",
	"app/api/electric/**/*.ts",
	"app/api/time-travel/**/*.ts",
	"app/api/migration/**/*.ts",
];

const DYNAMIC_EXPORT = `// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

`;

async function markRoutesDynamic() {
	console.log("🔍 Finding database-dependent routes...");

	const files: string[] = [];
	for (const pattern of DB_DEPENDENT_PATHS) {
		const matches = await glob(pattern, {
			cwd: process.cwd(),
			ignore: ["**/node_modules/**", "**/*.test.ts", "**/*.spec.ts"],
		});
		files.push(...matches.filter((f) => f.endsWith("/route.ts")));
	}

	console.log(`📁 Found ${files.length} route files to update`);

	let updated = 0;
	for (const file of files) {
		try {
			const content = readFileSync(file, "utf8");

			// Skip if already has dynamic export
			if (content.includes("export const dynamic = 'force-dynamic'")) {
				console.log(`⏭️  Skipping ${file} - already dynamic`);
				continue;
			}

			// Add dynamic export at the beginning
			const newContent = DYNAMIC_EXPORT + content;
			writeFileSync(file, newContent);
			updated++;
			console.log(`✅ Updated ${file}`);
		} catch (error) {
			console.error(`❌ Error updating ${file}:`, error);
		}
	}

	console.log(`\n✨ Updated ${updated} files with dynamic export`);
}

markRoutesDynamic().catch(console.error);
