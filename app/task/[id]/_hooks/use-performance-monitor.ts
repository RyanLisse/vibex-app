import { useEffect, useRef, useState } from "react";

interface PerformanceMetrics {
	renderTime: number;
	memoryUsage: number;
	rerenderCount: number;
	lastRenderTimestamp: number;
}

/**
 * Performance monitoring hook for development
 * - Tracks component render times
 * - Monitors memory usage
 * - Counts re-renders
 * - Provides performance insights
 */
export function usePerformanceMonitor(_componentName: string) {
	const [metrics, setMetrics] = useState<PerformanceMetrics>({
		renderTime: 0,
		memoryUsage: 0,
		rerenderCount: 0,
		lastRenderTimestamp: 0,
	});

	const renderStartTime = useRef<number>();
	const rerenderCount = useRef(0);

	useEffect(() => {
		renderStartTime.current = performance.now();
	});

	useEffect(() => {
		const renderEndTime = performance.now();
		const renderTime = renderStartTime.current
			? renderEndTime - renderStartTime.current
			: 0;

		rerenderCount.current += 1;

		const memoryUsage = (performance as any).memory
			? (performance as any).memory.usedJSHeapSize
			: 0;

		setMetrics({
			renderTime,
			memoryUsage,
			rerenderCount: rerenderCount.current,
			lastRenderTimestamp: renderEndTime,
		});

		// Log performance warnings in development
		if (process.env.NODE_ENV === "development") {
			if (renderTime > 16.67) {
			}
			if (rerenderCount.current > 10) {
			}
		}
	}, []);

	return metrics;
}
