"use client";
import { WifiOff } from "lucide-react";
import Link from "next/link";
import { TextShimmer } from "@/components/ui/text-shimmer";
import {
	useDeleteTaskMutation,
	useTasksQuery,
	useUpdateTaskMutation,
} from "@/hooks/use-task-queries";
