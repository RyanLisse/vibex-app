"use client";

/**
 * Unified Progress Dashboard
 *
 * Comprehensive dashboard for monitoring all agent activities,
 * migration progress, and system performance in real-time.
 */
import { Activity,
import { Users
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
	type AgentActivity,
	type AgentType,
	agentActivityTracker
} from "@/lib/observability/agent-activity-tracker";