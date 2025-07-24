#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

import { dirname, join } from "path";

const fixes = [];

// Fix 1: ReactFlow import - seems the script didn't run properly
const visualizationPath = join(process.cwd(), "components/ambient-agents/visualization-engine.tsx");
if (existsSync(visualizationPath)) {
	let content = readFileSync(visualizationPath, "utf-8");
	if (content.includes("import ReactFlow from")) {
		content = content.replace(
			/import\s+ReactFlow\s+from\s+['"]@xyflow\/react['"]/g,
			"ReactFlow } from '@xyflow/react'"
		);
		writeFileSync(visualizationPath, content);
		fixes.push("ReactFlow import in visualization-engine.tsx");
	}
}

// Fix 2: Redis exports
const redisClientPath = join(process.cwd(), "lib/redis/redis-client.ts");
if (existsSync(redisClientPath)) {
	let content = readFileSync(redisClientPath, "utf-8");
	if (!(content.includes("export { redis }") || content.includes("export const redis"))) {
		// Find the redis instance and export it
		if (content.includes("const redis =")) {
			content = content.replace(/const redis =/, "export const redis =");
		} else {
			// Add a default export
			content += "\n\n// Export redis client instance\nexport const redis = redisClient\n";
		}
		writeFileSync(redisClientPath, content);
		fixes.push("redis export in redis-client.ts");
	}
}

// Fix 3: metricsCollector export
const metricsPath = join(process.cwd(), "lib/observability/metrics.ts");
if (existsSync(metricsPath)) {
	let content = readFileSync(metricsPath, "utf-8");
	if (!content.includes("export const metricsCollector")) {
		// Add the export
		content +=
			"\n\n// Export metrics collector instance\nexport const metricsCollector = PerformanceMetricsCollector.getInstance()\n";
		writeFileSync(metricsPath, content);
		fixes.push("metricsCollector export in metrics.ts");
	}
}

// Fix 4: Enhanced task schemas
const schemasPath = join(process.cwd(), "src/schemas/enhanced-task-schemas.ts");
if (!existsSync(schemasPath)) {
	// Create the directory if it doesn't exist
	const dir = dirname(schemasPath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	// Create the schema file with all needed exports
	const schemaContent = `z } from 'zod'

// Kanban Move Schema
export const KanbanMoveSchema = z.object({
  taskId: z.string(),
  fromColumn: z.string(),
  toColumn: z.string(),
  position: z.number().optional(),
})

// Kanban Board Config Schema
export const KanbanBoardConfigSchema = z.object({
  columns: z.array(z.object({
    id: z.string(),
    title: z.string(),
    color: z.string().optional(),
    limit: z.number().optional(),
  })),
  defaultColumn: z.string().optional(),
})

// PR Status Update Schema
export const PRStatusUpdateSchema = z.object({
  taskId: z.string(),
  prUrl: z.string(),
  status: z.enum(['open', 'closed', 'merged', 'draft']),
  title: z.string().optional(),
  description: z.string().optional(),
  reviewers: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
})

// Task Progress Update Schema
export const TaskProgressUpdateSchema = z.object({
  taskId: z.string(),
  progress: z.number().min(0).max(100),
  milestone: z.string().optional(),
  completedSteps: z.array(z.string()).optional(),
  remainingSteps: z.array(z.string()).optional(),
  estimatedCompletion: z.string().datetime().optional(),
})

// Export types
export type KanbanMove = z.infer<typeof KanbanMoveSchema>
export type KanbanBoardConfig = z.infer<typeof KanbanBoardConfigSchema>
export type PRStatusUpdate = z.infer<typeof PRStatusUpdateSchema>
export type TaskProgressUpdate = z.infer<typeof TaskProgressUpdateSchema>
`;
	writeFileSync(schemasPath, schemaContent);
	fixes.push("enhanced-task-schemas.ts file created");
}

// Fix 5: Check for other ReactFlow imports
const files = ["components/ambient-agents/visualization-engine.tsx", "app/ambient-agents/page.tsx"];

for (const file of files) {
	const filePath = join(process.cwd(), file);
	if (existsSync(filePath)) {
		let content = readFileSync(filePath, "utf-8");
		let modified = false;

		// Fix ReactFlow imports
		if (content.includes("import ReactFlow")) {
			content = content.replace(
				/import\s+ReactFlow\s+from\s+['"]@xyflow\/react['"]/g,
				"ReactFlow } from '@xyflow/react'"
			);
			modified = true;
		}

		// Fix any default imports from @xyflow/react
		if (content.includes("from '@xyflow/react'") && content.includes("")) {
			// Make sure ReactFlow is imported as named export
			content = content.replace(
				/import\s+{\s*([^}]+)\s*},\s*ReactFlow\s+from\s+['"]@xyflow\/react['"]/g,
				"$1, ReactFlow } from '@xyflow/react'"
			);
			modified = true;
		}

		if (modified) {
			writeFileSync(filePath, content);
			fixes.push(`ReactFlow imports in ${file}`);
		}
	}
}

console.log("✅ Fixed the following issues:");
fixes.forEach((fix) => console.log(`  - ${fix}`));
console.log(`\n✨ Total fixes applied: ${fixes.length}`);
