#!/usr/bin/env bun

import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";
import path from "path";

async function fixMigrationFiles() {
	console.log("🔧 Fixing migration SQL files...");

	// Find all migration SQL files
	const sqlFiles = await glob("db/migrations/**/*.sql", {
		ignore: ["node_modules/**", "backup/**"],
		absolute: true,
	});

	let fixedCount = 0;

	for (const file of sqlFiles) {
		try {
			const content = await readFile(file, "utf-8");

			// Check if file already has Up/Down sections
			if (content.includes("-- Up") && content.includes("-- Down")) {
				console.log(`✓ Already formatted: ${path.relative(process.cwd(), file)}`);
				continue;
			}

			// For now, we'll wrap the entire content in an Up section
			// and provide a simple Down section
			const fileName = path.basename(file, ".sql");

			// Extract table names from CREATE TABLE statements
			const tableMatches = content.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/gi);
			const tables = tableMatches
				? tableMatches
						.map((match) => {
							const tableMatch = match.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
							return tableMatch ? tableMatch[1] : null;
						})
						.filter(Boolean)
				: [];

			// Build Down section
			let downSection = "-- Down\n";

			// Add DROP statements for tables in reverse order
			for (const table of tables.reverse()) {
				downSection += `DROP TABLE IF EXISTS ${table};\n`;
			}

			// Format the file with Up/Down sections
			const formattedContent = `-- Up\n${content.trim()}\n\n${downSection}`;

			await writeFile(file, formattedContent, "utf-8");
			fixedCount++;
			console.log(`✅ Fixed: ${path.relative(process.cwd(), file)}`);
		} catch (error) {
			console.error(`❌ Error processing ${file}:`, error);
		}
	}

	console.log(`\n✨ Fixed ${fixedCount} migration files`);
}

// Also update the migration runner to handle both formats
async function updateMigrationRunner() {
	console.log("\n🔧 Updating migration runner...");

	try {
		const runnerPath = path.join(process.cwd(), "db/migrations/migration-runner.ts");
		let content = await readFile(runnerPath, "utf-8");

		// Update loadMigrationFiles to handle both formats
		const loadMethodStart = content.indexOf("private loadMigrationFiles(");
		const loadMethodEnd = content.indexOf("\n  }", loadMethodStart) + 4;

		const newLoadMethod = `  private loadMigrationFiles(dir: string): MigrationFile[] {
    const files = readdirSync(dir).filter((file) => file.endsWith('.sql'))
    const migrationRegex = /^\\d{3}_[a-z0-9_-]+\\.sql$/i

    return files
      .filter((file) => migrationRegex.test(file))
      .sort()
      .map((file) => {
        const filePath = join(dir, file)
        const content = readFileSync(filePath, 'utf-8')
        const lines = content.split('\\n')

        // Try to find Up/Down sections
        const upStartIndex = lines.findIndex((line) => line.trim() === '-- Up')
        const downStartIndex = lines.findIndex((line) => line.trim() === '-- Down')

        let upSql: string
        let downSql: string

        if (upStartIndex !== -1 && downStartIndex !== -1) {
          // File has proper Up/Down sections
          upSql = lines
            .slice(upStartIndex + 1, downStartIndex)
            .join('\\n')
            .trim()

          downSql = lines
            .slice(downStartIndex + 1)
            .join('\\n')
            .trim()
        } else {
          // Legacy format - treat entire file as Up, generate simple Down
          upSql = content.trim()
          
          // Extract table names for Down section
          const tableMatches = content.match(/CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?(\\w+)/gi)
          const tables = tableMatches ? tableMatches.map(match => {
            const tableMatch = match.match(/CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?(\\w+)/i)
            return tableMatch ? tableMatch[1] : null
          }).filter(Boolean) : []
          
          // Generate Down SQL
          downSql = tables.reverse().map(table => \`DROP TABLE IF EXISTS \${table};\`).join('\\n')
        }

        const checksum = this.generateChecksum(upSql)

        return {
          name: file.replace('.sql', ''),
          up: upSql,
          down: downSql,
          checksum,
        }
      })
  }`;

		// Replace the method
		content = content.slice(0, loadMethodStart) + newLoadMethod + content.slice(loadMethodEnd);

		await writeFile(runnerPath, content, "utf-8");
		console.log("✅ Updated migration runner to handle both formats");
	} catch (error) {
		console.error("❌ Failed to update migration runner:", error);
	}
}

// Run both fixes
async function main() {
	await fixMigrationFiles();
	await updateMigrationRunner();
}

main().catch(console.error);
