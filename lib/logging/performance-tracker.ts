/**
 * Performance tracking utilities for logging
 */

export class PerformanceTracker {
	private metrics: Map<string, number[]>;

	constructor() {
		this.metrics = new Map();
	}

	start(operation: string): () => void {
		const startTime = performance.now();

		return () => {
			const duration = performance.now() - startTime;
			if (!this.metrics.has(operation)) {
				this.metrics.set(operation, []);
			}
			this.metrics.get(operation)!.push(duration);
		};
	}

	getMetrics(operation?: string): {
		[key: string]: { count: number; avg: number; min: number; max: number };
	} {
		const result: { [key: string]: { count: number; avg: number; min: number; max: number } } = {};

		const ops = operation ? [operation] : Array.from(this.metrics.keys());

		for (const op of ops) {
			const times = this.metrics.get(op);
			if (times && times.length > 0) {
				result[op] = {
					count: times.length,
					avg: times.reduce((a, b) => a + b, 0) / times.length,
					min: Math.min(...times),
					max: Math.max(...times),
				};
			}
		}

		return result;
	}

	clear(operation?: string): void {
		if (operation) {
			this.metrics.delete(operation);
		} else {
			this.metrics.clear();
		}
	}
}
