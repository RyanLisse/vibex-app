"use client";

import { WASMOptimizationStatus
} from "@/components/providers/query-provider";
import { CardTitle
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
	useElectricEnvironments,
	useElectricTasks
} from "@/hooks/use-electric-tasks";
import { useExecutionAnalyticsQuery } from "@/hooks/use-execution-queries";
	useCreateTaskMutation,
	useTaskSearchQuery,
	useTasksQuery,
	useUpdateTaskMutation
} from "@/hooks/use-task-queries";