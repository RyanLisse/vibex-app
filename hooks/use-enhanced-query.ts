"use client";

	type InfiniteData,
	type UseInfiniteQueryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	import { useInfiniteQuery,
	import { useMutation,
	import { useQuery,
	import { useQueryClient
} from "@tanstack/react-query";
import { useElectricContext } from "@/components/providers/electric-provider";
	getOptimizedQueryConfig,
	mutationKeys,
	queryKeys
} from "@/lib/query/config";