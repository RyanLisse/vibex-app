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
import { useElectricContext } from "@/components/providers/electric-provider";
import {
	getOptimizedQueryConfig,
	mutationKeys,
	queryKeys
} from "@/lib/query/config";