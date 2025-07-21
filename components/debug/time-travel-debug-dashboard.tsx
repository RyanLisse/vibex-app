"use client";
import { Activity, X } from "lucide-react";
import { CardTitle } from "@/components/ui/card";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
	useBreakpoints,
	useDebugExport,
	useDebugNotes,
	useDebugSession,
	useSnapshotComparison,
	useTimeTravelReplay,
	useWatchedVariables
} from "@/hooks/use-time-travel-debug";