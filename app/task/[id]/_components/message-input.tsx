"use client";

import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createTaskAction } from "@/app/actions/inngest";
import { useTaskContext } from "@/app/task/[id]/_providers/task-provider";
import { Button } from "@/components/ui/button";
import { useUpdateTask } from "@/lib/query/hooks";

/**
 * MessageInput component with improved UX and error handling
 * - Auto-adjusting height
 * - Keyboard shortcuts
 * - Loading states
 * - Error handling
 */
export function MessageInput() {
	const { task } = useTaskContext();
	const updateTaskMutation = useUpdateTask();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [messageValue, setMessageValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const adjustHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "60px"; // Reset to min height
			textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
		}
	}, []);

	const handleSendMessage = useCallback(async () => {
		if (!messageValue.trim() || isLoading) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			await createTaskAction({
				task,
				prompt: messageValue,
				sessionId: task.sessionId,
			});

			// Update task with new message
			updateTaskMutation.mutate({
				id: task.id,
				status: "IN_PROGRESS",
				statusMessage: "Working on task",
				messages: [
					...task.messages,
					{
						role: "user",
						type: "message",
						data: { text: messageValue, id: crypto.randomUUID() },
					},
				],
			});

			setMessageValue("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send message");
		} finally {
			setIsLoading(false);
		}
	}, [messageValue, isLoading, task, updateTaskMutation]);

	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSendMessage();
			}
		},
		[handleSendMessage],
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setMessageValue(e.target.value);
			setError(null); // Clear error on input change
		},
		[],
	);

	useEffect(() => {
		adjustHeight();
	}, [adjustHeight]);

	// Focus textarea on mount
	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	return (
		<div className="border-border border-t bg-background p-6">
			<div className="relative">
				<div className="rounded-2xl border-2 border-border bg-card shadow-lg transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-xl hover:shadow-xl">
					<div className="flex flex-col gap-y-3 p-4">
						<textarea
							className="max-h-[200px] min-h-[60px] w-full resize-none border-none bg-transparent p-0 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
							disabled={isLoading}
							onChange={handleChange}
							onKeyPress={handleKeyPress}
							placeholder="Type your message..."
							ref={textareaRef}
							style={{ scrollbarWidth: "thin" }}
							value={messageValue}
						/>

						{/* Error display */}
						{error && <div className="text-destructive text-xs">{error}</div>}

						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-xs">
								Press Enter to send, Shift+Enter for new line
							</span>
							<Button
								className="rounded-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
								disabled={!messageValue.trim() || isLoading}
								onClick={handleSendMessage}
								size="sm"
							>
								<Send className="mr-1 size-4" />
								{isLoading ? "Sending..." : "Send"}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
