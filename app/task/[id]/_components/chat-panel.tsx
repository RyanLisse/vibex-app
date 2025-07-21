"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, type ChatMessageData } from "./chat-message";
import { MessageInput } from "./message-input";
import { ChatLoadingState } from "./chat-loading-state";

interface ChatPanelProps {
	messages: ChatMessageData[];
	onSendMessage: (message: string) => Promise<void>;
	isLoading?: boolean;
	title?: string;
}

export function ChatPanel({
	messages,
	onSendMessage,
	isLoading = false,
	title = "Chat",
}: ChatPanelProps) {
	const [isProcessing, setIsProcessing] = useState(false);

	const handleSendMessage = async (message: string) => {
		setIsProcessing(true);
		try {
			await onSendMessage(message);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<Card className="h-full flex flex-col">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col gap-4 p-4">
				<ScrollArea className="flex-1">
					<div className="space-y-4 pr-4">
						{messages.map((message) => (
							<ChatMessage key={message.id} message={message} />
						))}
						{isLoading && <ChatLoadingState />}
					</div>
				</ScrollArea>
				<MessageInput
					onSendMessage={handleSendMessage}
					disabled={isLoading || isProcessing}
					placeholder="Type your message..."
				/>
			</CardContent>
		</Card>
	);
}
