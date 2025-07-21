/**
 * Enhanced Task List Component
 *
 * Updated to use TanStack Query hooks instead of direct store access,
 * with optimistic updates, loading states, error boundaries, and offline indicators.
 */

"use client";

import { useState, useEffect } from "react";
import { WifiOff, Plus, MoreHorizontal, Edit, Trash2, Play, Pause, CheckCircle } from "lucide-react";
import Link from "next/link";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	useDeleteTaskMutation,
	useTasksQuery,
	useUpdateTaskMutation
} from "@/hooks/use-task-queries";