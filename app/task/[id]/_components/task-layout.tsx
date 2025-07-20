import { memo } from "react";
import { ChatPanel } from "@/app/task/[id]/_components/chat-panel";
import { ShellOutputPanel } from "@/app/task/[id]/_components/shell-output-panel";
import { useTaskContext } from "@/app/task/[id]/_providers/task-provider";

/**
 * TaskLayout handles the main layout structure of the task page
 * - Separates layout concerns from business logic
 * - Uses context to access task data
 * - Memoized to prevent unnecessary re-renders
 */
export const TaskLayout = memo(function TaskLayout() {
	const { shellMessages } = useTaskContext();

	return (
		<div className="flex flex-1 overflow-hidden">
			<ChatPanel />
			<ShellOutputPanel shellMessages={shellMessages} />
		</div>
	);
});
