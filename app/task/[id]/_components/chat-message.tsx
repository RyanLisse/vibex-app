"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Markdown } from "@/components/markdown";
import { formatDistanceToNow } from "date-fns";

export interface ChatMessageData {
	id: string;
	content: string;
	role: "user" | "assistant" | "system";
	timestamp: Date;
	metadata?: Record<string, any>;
}

interface ChatMessageProps {
	message: ChatMessageData;
	showTimestamp?: boolean;
	showAvatar?: boolean;
}

export const ChatMessage = memo(function ChatMessage({
	message,
	showTimestamp = true,
	showAvatar = true,
}: ChatMessageProps) {
	const isUser = message.role === "user";
	const isSystem = message.role === "system";

	const getRoleColor = () => {
		switch (message.role) {
			case "user":
				return "bg-blue-100 text-blue-900";
			case "assistant":
				return "bg-green-100 text-green-900";
			case "system":
				return "bg-gray-100 text-gray-900";
			default:
				return "bg-gray-100 text-gray-900";
		}
	};

	const getAvatarInitials = () => {
		switch (message.role) {
			case "user":
				return "U";
			case "assistant":
				return "AI";
			case "system":
				return "S";
			default:
				return "?";
		}
	};

	return (
		<div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
			{showAvatar && (
				<Avatar className="shrink-0">
					<AvatarFallback className={getRoleColor()}>
						{getAvatarInitials()}
					</AvatarFallback>
				</Avatar>
			)}

			<div
				className={`flex-1 max-w-[80%] ${isUser ? "text-right" : "text-left"}`}
			>
				<Card className={`${isUser ? "ml-auto" : "mr-auto"}`}>
					<CardContent className="p-3">
						{isSystem && (
							<Badge variant="secondary" className="mb-2">
								System
							</Badge>
						)}

						<div className="prose prose-sm max-w-none">
							<Markdown content={message.content} />
						</div>

						{showTimestamp && (
							<div className="text-xs text-gray-500 mt-2">
								{formatDistanceToNow(message.timestamp, { addSuffix: true })}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
});
