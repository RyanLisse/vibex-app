import { MicIcon, SendIcon, StopCircleIcon } from "lucide-react";
import type React from "react";
import { memo, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface ChatInputAreaProps {
	isConnected: boolean;
	isRecording: boolean;
	formattedDuration: string;
	onSendMessage: (message: string) => void;
	onStartRecording: () => void;
	onStopRecording: () => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

export const ChatInputArea = memo(
	({
		isConnected,
		isRecording,
		formattedDuration,
		onSendMessage,
		onStartRecording,
		onStopRecording,
		disabled = false,
		placeholder = "Type a message...",
		className,
	}: ChatInputAreaProps) => {
		const [inputValue, setInputValue] = useState("");
		const inputRef = useRef<HTMLInputElement>(null);

		const handleSendMessage = useCallback(() => {
			const message = inputValue.trim();
			if (message && isConnected && !disabled) {
				onSendMessage(message);
				setInputValue("");
				inputRef.current?.focus();
			}
		}, [inputValue, isConnected, disabled, onSendMessage]);

		const handleKeyPress = useCallback(
			(e: React.KeyboardEvent) => {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					handleSendMessage();
				}
			},
			[handleSendMessage],
		);

		const handleRecordingToggle = useCallback(() => {
			if (isRecording) {
				onStopRecording();
			} else {
				onStartRecording();
			}
		}, [isRecording, onStartRecording, onStopRecording]);

		const isInputDisabled = !isConnected || disabled;
		const isSendDisabled = isInputDisabled || !inputValue.trim();

		return (
			<div className={className}>
				<div className="flex gap-2">
					<input
						aria-label="Chat message input"
						className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={isInputDisabled}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder={
							isConnected ? placeholder : "Connect to start chatting"
						}
						ref={inputRef}
						type="text"
						value={inputValue}
					/>

					{/* Audio recording button */}
					<Button
						aria-label={isRecording ? "Stop recording" : "Start recording"}
						disabled={isInputDisabled}
						onClick={handleRecordingToggle}
						size="icon"
						title={isRecording ? "Stop recording" : "Start recording"}
						variant={isRecording ? "destructive" : "outline"}
					>
						{isRecording ? (
							<StopCircleIcon className="h-4 w-4" />
						) : (
							<MicIcon className="h-4 w-4" />
						)}
					</Button>

					{/* Send button */}
					<Button
						aria-label="Send message"
						disabled={isSendDisabled}
						onClick={handleSendMessage}
						size="icon"
						title="Send message"
					>
						<SendIcon className="h-4 w-4" />
					</Button>
				</div>

				{/* Recording indicator */}
				{isRecording && (
					<div className="mt-2 flex items-center gap-2 text-muted-foreground text-sm">
						<div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
						<span aria-live="polite">Recording: {formattedDuration}</span>
					</div>
				)}
			</div>
		);
	},
);

ChatInputArea.displayName = "ChatInputArea";
