"use client";

import { formatDistanceToNow } from "date-fns";
import { memo, useMemo } from "react";
import { Markdown } from "@/components/markdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

	// Extract role configuration to reduce complexity and eliminate multiple return statements
	const roleConfig = useMemo(() => {
		const configs = {
			user: { color: "bg-blue-100 text-blue-900", initials: "U" },
			assistant: { color: "bg-green-100 text-green-900", initials: "AI" },
			system: { color: "bg-gray-100 text-gray-900", initials: "S" },
		};
		return configs[message.role] || { color: "bg-gray-100 text-gray-900", initials: "?" };
	}, [message.role]);

	return (
		<div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
			{showAvatar && (
				<Avatar className="shrink-0">
					<AvatarFallback className={roleConfig.color}>{roleConfig.initials}</AvatarFallback>
				</Avatar>
			)}

			<div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : "text-left"}`}>
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
