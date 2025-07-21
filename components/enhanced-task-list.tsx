/**
 * Enhanced Task List Component
 *
 * Updated to use TanStack Query hooks instead of direct store access,
 * with optimistic updates, loading states, error boundaries, and offline indicators.
 */

"use client";

import {
	CheckCircle,
	Edit,
	MoreHorizontal,
	Pause,
	Play,
	Plus,
	Trash2,
	WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TextShimmer } from "@/components/ui/text-shimmer";
import {
	useDeleteTaskMutation,
	useTasksQuery,
	useUpdateTaskMutation,
} from "@/hooks/use-task-queries";
