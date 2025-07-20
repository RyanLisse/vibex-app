#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { join } from "path";

// Find ALL API routes
const routes = glob.sync("app/api/**/route.ts", { cwd: process.cwd() });

const dynamicExport = `// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

`;

let updated = 0;
let skipped = 0;

for (const route of routes) {
	const filePath = join(process.cwd(), route);
	let content = readFileSync(filePath, "utf-8");

	// Check if already has both exports
	const hasDynamic = content.includes("export const dynamic");
	const hasRuntime = content.includes("export const runtime");

	if (hasDynamic && hasRuntime) {
		skipped++;
	} else {
		// Remove existing partial exports
		content = content.replace(
			/export const dynamic = ['"]force-dynamic['"]\n?/g,
			"",
		);
		content = content.replace(/export const runtime = ['"]nodejs['"]\n?/g, "");

		// Add at the beginning after any leading comments
		const lines = content.split("\n");
		let insertIndex = 0;

		// Skip leading empty lines and comments
		while (
			insertIndex < lines.length &&
			(lines[insertIndex].trim() === "" ||
				lines[insertIndex].trim().startsWith("//"))
		) {
			insertIndex++;
		}

		lines.splice(insertIndex, 0, ...dynamicExport.trim().split("\n"));
		content = lines.join("\n");

		writeFileSync(filePath, content);
		console.log(`✅ Updated ${route}`);
		updated++;
	}
}

console.log("\n✨ Results:");
console.log(`   - Updated: ${updated} routes`);
console.log(`   - Already configured: ${skipped} routes`);
console.log(`   - Total API routes: ${routes.length}`);
