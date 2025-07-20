import type { Metadata } from "next";
import { DatabaseObservabilityDemo } from "@/components/database-observability-demo";
import { ElectricProvider } from "@/components/providers/electric-provider";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
	title: "Database Observability Demo | Codex Clone",
	description:
		"Comprehensive demonstration of ElectricSQL, Enhanced TanStack Query, and WASM optimizations working together in a real-time collaborative environment.",
	keywords: [
		"database observability",
		"ElectricSQL",
		"TanStack Query",
		"WASM optimization",
		"real-time sync",
		"offline-first",
		"collaborative editing",
		"performance monitoring",
	],
};

/**
 * Database Observability Demo Page
 *
 * This page showcases the comprehensive database observability system
 * that combines multiple advanced technologies:
 *
 * - ElectricSQL for offline-first real-time synchronization
 * - Enhanced TanStack Query with WASM optimizations
 * - Multi-user collaboration simulation
 * - Performance monitoring and analytics
 * - Network status simulation and testing
 *
 * The demo provides an interactive environment to explore:
 * - Real-time collaborative task management
 * - Intelligent search with semantic capabilities
 * - Performance metrics and optimization comparisons
 * - System health monitoring and observability
 */
export default function DatabaseObservabilityDemoPage() {
	return (
		<QueryProvider enableDevtools={true}>
			<ElectricProvider
				fallback={
					<div className="flex min-h-screen items-center justify-center">
						<div className="text-center">
							<div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-blue-600 border-b-2" />
							<p className="font-medium text-lg">
								Initializing Database Systems...
							</p>
							<p className="mt-2 text-gray-600 text-sm">
								Setting up ElectricSQL, WASM services, and TanStack Query
							</p>
						</div>
					</div>
				}
			>
				<DatabaseObservabilityDemo />
			</ElectricProvider>
		</QueryProvider>
	);
}
