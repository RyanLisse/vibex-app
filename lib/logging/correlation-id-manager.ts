// AsyncLocalStorage compatibility layer
class BrowserAsyncLocalStorage {
	private store: any = null;
	run(store: any, callback: () => any) {
		this.store = store;
		return callback();
	}
	getStore() {
		return this.store;
	}
}

// Use dynamic import pattern that's ESM-compatible
let AsyncLocalStorage: any = BrowserAsyncLocalStorage;

if (typeof window === "undefined" && typeof process !== "undefined") {
	// Lazy load in Node.js environment
	import("async_hooks")
		.then((asyncHooks) => {
			AsyncLocalStorage = asyncHooks.AsyncLocalStorage;
		})
		.catch(() => {
			// Keep using browser fallback if async_hooks is not available
		});
}
