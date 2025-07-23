/**
 * Main export point for TanStack Query integration
 */

// Export ElectricSQL bridge
export {
	type ElectricBridgeConfig,
	electricQueryBridge,
} from "../query/electric-bridge";
// Export query provider
export {
	createQueryProviderConfig,
	QueryDevStatus,
	QueryProvider,
	useElectricBridgeStats,
	useElectricConnection,
	useQueryProvider,
	useTableInvalidation,
} from "../query/provider";
// Export configuration and utilities
export {
	createOptimizedQueryClient,
	getOptimizedQueryConfig,
	invalidateByTable,
	invalidateQueries,
	mutationKeys,
	queryClient,
	queryKeys,
} from "./config";
// Export all hooks
export * from "./hooks";
