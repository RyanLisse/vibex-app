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

export class CorrelationIdManager {
	private static instance: CorrelationIdManager;
	private asyncLocalStorage: any;

	private constructor() {
		this.asyncLocalStorage = new AsyncLocalStorage();
	}

	static getInstance(): CorrelationIdManager {
		if (!CorrelationIdManager.instance) {
			CorrelationIdManager.instance = new CorrelationIdManager();
		}
		return CorrelationIdManager.instance;
	}

	generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
	}

	withCorrelationId<T>(correlationId: string, callback: () => T): T {
		return this.asyncLocalStorage.run({ correlationId }, callback);
	}

	getCurrentId(): string | undefined {
		const store = this.asyncLocalStorage.getStore();
		return store?.correlationId;
	}
}
