import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./db/schema.ts",
	out: "./db/migrations/drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
	verbose: true,
	strict: true,
	migrations: {
		prefix: "timestamp",
		table: "migrations",
		schema: "public",
	},
	introspect: {
		casing: "snake_case",
	},
});
