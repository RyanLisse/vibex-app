"use client";

import { Loader2, Mic, Paperclip, Send, Square } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ChatInputAreaProps {
	value?: string;
	onChange?: (value: string) => void;
	onSubmit?: (message: string) => void;
	placeholder?: string;
	disabled?: boolean;
	loading?: boolean;
	maxLength?: number;
	showAttachments?: boolean;
	showVoice?: boolean;
	onAttachmentClick?: () => void;
	onVoiceClick?: () => void;
	isRecording?: boolean;
	className?: string;
}

/**
 * A comprehensive chat input area component for AI conversations
 * Supports text input, attachments, voice recording, and various states
 */
export const ChatInputArea = React.forwardRef<HTMLTextAreaElement, ChatInputAreaProps>(
	(
		{
			value = "",
			onChange,
			onSubmit,
			placeholder = "Type your message...",
			disabled = false,
			loading = false,
			maxLength = 4000,
			showAttachments = false,
			showVoice = false,
			onAttachmentClick,
			onVoiceClick,
			isRecording = false,
			className,
			...props
		},
		ref
	) => {
		const [internalValue, setInternalValue] = React.useState(value);
		const textareaRef = React.useRef<HTMLTextAreaElement>(null);

		// Use forwarded ref or internal ref
		const resolvedRef = ref || textareaRef;

		// Sync internal value with prop value
		React.useEffect(() => {
			setInternalValue(value);
		}, [value]);

		// Auto-resize textarea
		React.useEffect(() => {
			const textarea = typeof resolvedRef === "object" && resolvedRef?.current;
			if (textarea) {
				textarea.style.height = "auto";
				textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
			}
		}, [internalValue, resolvedRef]);

		const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			const newValue = e.target.value;
			if (maxLength && newValue.length > maxLength) return;

			setInternalValue(newValue);
			onChange?.(newValue);
		};

		const handleSubmit = () => {
			const trimmedValue = internalValue.trim();
			if (!trimmedValue || disabled || loading) return;

			onSubmit?.(trimmedValue);
			setInternalValue("");
			onChange?.("");
		};

		const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		};

		const canSubmit = internalValue.trim().length > 0 && !disabled && !loading;

		return (
			<div className={cn("flex flex-col space-y-2", className)}>
				<div className="flex items-end space-x-2">
					{/* Attachment button */}
					{showAttachments && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={onAttachmentClick}
							disabled={disabled || loading}
							className="shrink-0"
						>
							<Paperclip className="h-4 w-4" />
						</Button>
					)}

					{/* Text input area */}
					<div className="flex-1 relative">
						<Textarea
							ref={resolvedRef}
							value={internalValue}
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							placeholder={placeholder}
							disabled={disabled || loading}
							className="min-h-[44px] max-h-[120px] resize-none pr-12"
							{...props}
						/>

						{/* Character count */}
						{maxLength && (
							<div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
								{internalValue.length}/{maxLength}
							</div>
						)}
					</div>

					{/* Voice button */}
					{showVoice && (
						<Button
							type="button"
							variant={isRecording ? "destructive" : "ghost"}
							size="sm"
							onClick={onVoiceClick}
							disabled={disabled || loading}
							className="shrink-0"
						>
							{isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
						</Button>
					)}

					{/* Send button */}
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={!canSubmit}
						size="sm"
						className="shrink-0"
					>
						{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
					</Button>
				</div>

				{/* Status indicators */}
				{(loading || isRecording) && (
					<div className="flex items-center space-x-2 text-sm text-muted-foreground">
						{loading && (
							<>
								<Loader2 className="h-3 w-3 animate-spin" />
								<span>Sending...</span>
							</>
						)}
						{isRecording && (
							<>
								<div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
								<span>Recording...</span>
							</>
						)}
					</div>
				)}
			</div>
		);
	}
);

ChatInputArea.displayName = "ChatInputArea";

export default ChatInputArea;
