import { memo, Suspense } from "react";
import { ChatLoadingState } from "@/app/task/[id]/_components/chat-loading-state";
import { ChatMessagesPanel } from "@/app/task/[id]/_components/chat-messages-panel";
import { MessageInput } from "@/app/task/[id]/_components/message-input";
import { TaskLoadingState } from "@/app/task/[id]/_components/task-loading-state";
import { useEnhancedAutoScroll } from "@/app/task/[id]/_hooks/use-enhanced-auto-scroll";
import { useTaskContext } from "@/app/task/[id]/_providers/task-provider";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * ChatPanel manages the chat interface layout and state
 * - Handles auto-scrolling behavior
 * - Manages loading states
 * - Provides clean separation of chat concerns
 */
export const ChatPanel = memo(function ChatPanel() {
	const {
		task,
		regularMessages,
		streamingMessages,
		hasStreamingMessages,
		isTaskInProgress,
	} = useTaskContext();

	const chatScrollAreaRef = useEnhancedAutoScroll<HTMLDivElement>(
		[task?.messages, streamingMessages],
		{
			smooth: true,
			threshold: 100,
			debounceMs: 50,
		},
	);

	return (
		<div className="mx-auto flex h-full w-full max-w-3xl flex-col border-border border-r bg-gradient-to-b from-background to-muted/5">
			<ScrollArea
				className="scroll-area-custom flex-1 overflow-y-auto"
				ref={chatScrollAreaRef}
			>
				<div className="flex flex-col gap-y-6 p-6">
					<Suspense fallback={<ChatLoadingState />}>
						<ChatMessagesPanel
							regularMessages={regularMessages}
							streamingMessages={streamingMessages}
							task={task}
						/>
					</Suspense>

					{/* Show loading state when task is in progress but no streaming messages */}
					{isTaskInProgress && !hasStreamingMessages && (
						<TaskLoadingState statusMessage={task.statusMessage} />
					)}
				</div>
			</ScrollArea>

			{/* Message Input - Fixed at bottom */}
			<div className="flex-shrink-0">
				<MessageInput />
			</div>
		</div>
	);
});
