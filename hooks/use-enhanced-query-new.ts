"use client";

import {
	type InfiniteData,
	type UseInfiniteQueryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient
} from "@tanstack/react-query";
import { ObservabilityService } from "@/lib/observability";
import {
	getOptimizedQueryConfig,
	mutationKeys,
	queryKeys
} from "@/lib/query/config";