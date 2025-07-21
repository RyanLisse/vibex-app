#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "fs";
join } from "path";

// Fix correlation-id-manager to be browser-safe
const correlationIdPath = join(
	process.cwd(),
	"lib/logging/correlation-id-manager.ts",
);
if (existsSync(correlationIdPath)) {
	let content = readFileSync(correlationIdPath, "utf-8");

	// Wrap async_hooks import in server-only check
	content = content.replace(
		/import\s*{\s*AsyncLocalStorage\s*}\s*from\s*['"]async_hooks['"]/g,
		`let AsyncLocalStorage: any
if (typeof window === 'undefined') {
AsyncLocalStorage = require('async_hooks').AsyncLocalStorage
} else {
  // Browser fallback
AsyncLocalStorage = class {
    private store: any = null
    run(store: any, callback: () => any) {
      this.store = store
      return callback()
    }
    getStore() {
      return this.store
    }
  }
}`,
	);

	writeFileSync(correlationIdPath, content);
	console.log("✅ Fixed correlation-id-manager for browser compatibility");
}

// Fix logger-factory to be browser-safe
const loggerFactoryPath = join(process.cwd(), "lib/logging/logger-factory.ts");
if (existsSync(loggerFactoryPath)) {
	let content = readFileSync(loggerFactoryPath, "utf-8");

	// Check if it uses async_hooks
	if (content.includes("async_hooks")) {
		content = content.replace(
			/import\s*{\s*AsyncLocalStorage\s*}\s*from\s*['"]async_hooks['"]/g,
			`let AsyncLocalStorage: any
if (typeof window === 'undefined') {
AsyncLocalStorage = require('async_hooks').AsyncLocalStorage
} else {
import { AsyncLocalStorage = class {
    private store: any = null
    run(store: any, callback: () => any) {
      this.store = store
      return callback()
    }
    getStore() {
      return this.store
    }
  }
}`,
		);
		writeFileSync(loggerFactoryPath, content);
		console.log("✅ Fixed logger-factory for browser compatibility");
	}
}

console.log("✨ Logging browser compatibility fixes complete!");
