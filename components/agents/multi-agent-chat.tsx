"use client";

import {
	Brain,
	MessageSquare,
	Mic,
	MicOff,
	Pause,
	Play,
	Sparkles,
	Volume2,
	VolumeX,
} from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Message {
	id: string;
	agent: string;
	content: string;
	timestamp: Date;
}

interface MultiAgentChatProps {
	agents?: string[];
	onMessageSent?: (message: string) => void;
	className?: string;
}

export const MultiAgentChat = React.memo(function MultiAgentChat({
	agents = ["Agent 1", "Agent 2", "Agent 3"],
	onMessageSent,
	className,
}: MultiAgentChatProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isRecording, setIsRecording] = useState(false);

	const sendMessage = useCallback(() => {
		if (inputValue.trim()) {
			const newMessage: Message = {
				id: Date.now().toString(),
				agent: "User",
				content: inputValue,
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, newMessage]);
			onMessageSent?.(inputValue);
			setInputValue("");
		}
	}, [inputValue, onMessageSent]);

	const toggleRecording = useCallback(() => {
		setIsRecording((prev) => !prev);
		// TODO: Implement voice recording
	}, []);

	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				sendMessage();
			}
		},
		[sendMessage]
	);

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
	}, []);

	const emptyState = useMemo(
		() => (
			<div className="text-center text-muted-foreground py-8">
				<Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
				<p>Start a conversation with the agents</p>
			</div>
		),
		[]
	);

	const messagesList = useMemo(
		() =>
			messages.map((message) => (
				<div key={message.id} className="mb-2 p-2 rounded-md bg-muted">
					<div className="font-semibold text-sm">{message.agent}</div>
					<div>{message.content}</div>
				</div>
			)),
		[messages]
	);

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<MessageSquare className="h-5 w-5" />
					Multi-Agent Chat
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<div className="h-64 border rounded-md p-4 overflow-y-auto">
						{messages.length === 0 ? emptyState : messagesList}
					</div>

					<div className="flex gap-2">
						<Input
							value={inputValue}
							onChange={handleInputChange}
							placeholder="Type your message..."
							onKeyPress={handleKeyPress}
						/>
						<Button onClick={sendMessage}>Send</Button>
						<Button
							onClick={toggleRecording}
							variant={isRecording ? "destructive" : "outline"}
							size="icon"
						>
							{isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
});
