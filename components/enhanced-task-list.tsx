/**
 * Enhanced Task List Component
 *
 * Updated to use TanStack Query hooks instead of direct store access,
 * with optimistic updates, loading states, error boundaries, and offline indicators.
 */

"use client";

import { WifiOff
} from "lucide-react";
import Link from "next/link";
import { TextShimmer } from "@/components/ui/text-shimmer";
	useDeleteTaskMutation,
	useTasksQuery,
	useUpdateTaskMutation
} from "@/hooks/use-task-queries";