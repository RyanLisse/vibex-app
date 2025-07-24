/**
 * Performance optimization utilities for production use
 */

import { useCallback, useEffect, useRef, useState } from "react";

// Debounce hook for performance optimization
export function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number): T {
	const timeoutRef = useRef<NodeJS.Timeout>();
	const callbackRef = useRef(callback);

	// Update callback ref when callback changes
	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	return useCallback(
		(...args: Parameters<T>) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				callbackRef.current(...args);
			}, delay);
		},
		[delay]
	) as T;
}

// Throttle hook for performance optimization
export function useThrottle<T extends (...args: any[]) => void>(callback: T, delay: number): T {
	const lastRun = useRef(Date.now());
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	return useCallback(
		(...args: Parameters<T>) => {
			if (Date.now() - lastRun.current >= delay) {
				callbackRef.current(...args);
				lastRun.current = Date.now();
			}
		},
		[delay]
	) as T;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
	elementRef: React.RefObject<Element>,
	options: IntersectionObserverInit = {}
) {
	const [isIntersecting, setIsIntersecting] = useState(false);
	const [hasIntersected, setHasIntersected] = useState(false);

	useEffect(() => {
		const element = elementRef.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				const isElementIntersecting = entry.isIntersecting;
				setIsIntersecting(isElementIntersecting);

				if (isElementIntersecting && !hasIntersected) {
					setHasIntersected(true);
				}
			},
			{
				threshold: 0.1,
				rootMargin: "50px",
				...options,
			}
		);

		observer.observe(element);

		return () => {
			observer.unobserve(element);
			observer.disconnect();
		};
	}, [elementRef, hasIntersected, options]);

	return { isIntersecting, hasIntersected };
}

// Performance measurement utilities
export class PerformanceMonitor {
	private static measurements = new Map<string, number>();

	static startMeasurement(name: string) {
		PerformanceMonitor.measurements.set(name, performance.now());
	}

	static endMeasurement(name: string): number {
		const startTime = PerformanceMonitor.measurements.get(name);
		if (!startTime) {
			return 0;
		}

		const duration = performance.now() - startTime;
		PerformanceMonitor.measurements.delete(name);

		return duration;
	}

	static measureAsync<T>(name: string, asyncFn: () => Promise<T>): Promise<T> {
		PerformanceMonitor.startMeasurement(name);
		return asyncFn().finally(() => {
			PerformanceMonitor.endMeasurement(name);
		});
	}

	static measureSync<T>(name: string, syncFn: () => T): T {
		PerformanceMonitor.startMeasurement(name);
		try {
			return syncFn();
		} finally {
			PerformanceMonitor.endMeasurement(name);
		}
	}
}

// React component performance wrapper
export function withPerformanceMonitoring<P extends object>(
	WrappedComponent: React.ComponentType<P>,
	componentName?: string
) {
	const name =
		componentName || WrappedComponent.displayName || WrappedComponent.name || "Component";

	return function PerformanceMonitoredComponent(props: P) {
		useEffect(() => {
			PerformanceMonitor.startMeasurement(`${name}-render`);
			return () => {
				PerformanceMonitor.endMeasurement(`${name}-render`);
			};
		});

		return <WrappedComponent {...props} />;
	};
}

// Image optimization utilities
export interface OptimizedImageProps {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	loading?: "lazy" | "eager";
	className?: string;
	onLoad?: () => void;
	onError?: () => void;
}

export function OptimizedImage({
	src,
	alt,
	width,
	height,
	loading = "lazy",
	className,
	onLoad,
	onError,
}: OptimizedImageProps) {
	const imgRef = useRef<HTMLImageElement>(null);
	const { hasIntersected } = useIntersectionObserver(imgRef);

	const [isLoaded, setIsLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);

	const handleLoad = useCallback(() => {
		setIsLoaded(true);
		onLoad?.();
	}, [onLoad]);

	const handleError = useCallback(() => {
		setHasError(true);
		onError?.();
	}, [onError]);

	// Only load image when it's about to be visible
	const shouldLoad = loading === "eager" || hasIntersected;

	return (
		<div
			ref={imgRef}
			className={`relative overflow-hidden ${className || ""}`}
			style={{ width, height }}
		>
			{shouldLoad && !hasError && (
				// Using Next.js Image component for better performance
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={src}
					alt={alt}
					width={width}
					height={height}
					loading={loading}
					onLoad={handleLoad}
					onError={handleError}
					className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "cover",
					}}
				/>
			)}

			{!isLoaded && !hasError && (
				<div
					className="absolute inset-0 bg-gray-200 animate-pulse"
					style={{ width: "100%", height: "100%" }}
				/>
			)}

			{hasError && (
				<div
					className="absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-400"
					style={{ width: "100%", height: "100%" }}
				>
					Failed to load image
				</div>
			)}
		</div>
	);
}

// Cache management utilities
export class CacheManager {
	private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

	static set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
		CacheManager.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl: ttlMs,
		});
	}

	static get<T>(key: string): T | null {
		const entry = CacheManager.cache.get(key);
		if (!entry) return null;

		const isExpired = Date.now() - entry.timestamp > entry.ttl;
		if (isExpired) {
			CacheManager.cache.delete(key);
			return null;
		}

		return entry.data;
	}

	static clear(prefix?: string) {
		if (prefix) {
			for (const [key] of CacheManager.cache) {
				if (key.startsWith(prefix)) {
					CacheManager.cache.delete(key);
				}
			}
		} else {
			CacheManager.cache.clear();
		}
	}
}

// Virtual scrolling utilities
export function useVirtualList<T>(items: T[], containerHeight: number, itemHeight: number) {
	const [scrollTop, setScrollTop] = useState(0);

	const startIndex = Math.floor(scrollTop / itemHeight);
	const endIndex = Math.min(
		startIndex + Math.ceil(containerHeight / itemHeight) + 1,
		items.length - 1
	);

	const visibleItems = items.slice(startIndex, endIndex + 1);
	const totalHeight = items.length * itemHeight;
	const offsetY = startIndex * itemHeight;

	return {
		visibleItems,
		totalHeight,
		offsetY,
		setScrollTop,
	};
}
