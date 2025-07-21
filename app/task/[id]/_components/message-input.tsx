"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface MessageInputProps {
	onSendMessage: (message: string) => Promise<void>;
	disabled?: boolean;
	placeholder?: string;
}

export function MessageInput({
	onSendMessage,
	disabled = false,
	placeholder = "Type your message...",
}: MessageInputProps) {
	const [message, setMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();

			if (!message.trim() || isLoading || disabled) {
				return;
			}

			const messageToSend = message.trim();
			setMessage("");
			setIsLoading(true);

			try {
				await onSendMessage(messageToSend);
			} catch (error) {
				console.error("Failed to send message:", error);
				// Restore message on error
				setMessage(messageToSend);
			} finally {
				setIsLoading(false);
			}
		},
		[message, isLoading, disabled, onSendMessage],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit(e);
			}
		},
		[handleSubmit],
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setMessage(e.target.value);
		},
		[],
	);

	return (
		<form onSubmit={handleSubmit} className="flex gap-2 items-end">
			<Textarea
				ref={textareaRef}
				value={message}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				disabled={disabled || isLoading}
				className="flex-1 min-h-[40px] max-h-32 resize-none"
				rows={1}
			/>
			<Button
				type="submit"
				size="sm"
				disabled={!message.trim() || disabled || isLoading}
				className="shrink-0"
			>
				{isLoading ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Send className="h-4 w-4" />
				)}
			</Button>
		</form>
	);
}
