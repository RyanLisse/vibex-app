import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./db/schema.ts",
	out: "./db/migrations/sql",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "",
	},
	verbose: true,
	strict: true,
	migrations: {
		prefix: "timestamp",
		table: "migrations",
		schema: "public",
	},
});
