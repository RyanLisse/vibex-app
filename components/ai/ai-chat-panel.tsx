/**
 * AI Chat Panel Component
 *
 * A complete chat interface for the unified AI system
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, StopCircle, RefreshCw, Trash2, Settings } from "lucide-react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { AI_MODELS } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface AIChatPanelProps {
	className?: string;
	defaultModel?: string;
	defaultProvider?: string;
	systemPrompt?: string;
	showSettings?: boolean;
	height?: string;
}

export function AIChatPanel({
	className,
	defaultModel = AI_MODELS.GPT_3_5_TURBO,
	defaultProvider,
	systemPrompt,
	showSettings = true,
	height = "600px",
}: AIChatPanelProps) {
	const [selectedModel, setSelectedModel] = useState(defaultModel);
	const [selectedProvider, setSelectedProvider] = useState(defaultProvider);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	const {
		messages,
		input,
		isLoading,
		error,
		metadata,
		setInput,
		sendMessage,
		stop,
		reload,
		clear,
	} = useAIChat({
		model: selectedModel,
		provider: selectedProvider,
		systemPrompt,
		onError: (error) => {
			console.error("AI Chat Error:", error);
		},
	});

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (scrollAreaRef.current) {
			const scrollContainer = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]"
			);
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	}, [messages]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (!isLoading && input.trim()) {
				sendMessage();
			}
		}
	};

	const userMessages = messages.filter((m) => m.role !== "system");

	return (
		<Card className={cn("flex flex-col", className)} style={{ height }}>
			<CardHeader className="flex-shrink-0">
				<div className="flex items-center justify-between">
					<CardTitle>AI Chat</CardTitle>
					<div className="flex items-center gap-2">
						{metadata && (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Badge variant="secondary">{metadata.provider}</Badge>
								<span>{metadata.latency}ms</span>
								{metadata.cached && <Badge variant="outline">Cached</Badge>}
							</div>
						)}
						{showSettings && (
							<Button variant="ghost" size="icon" onClick={() => setShowAdvanced(!showAdvanced)}>
								<Settings className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>

				{showSettings && showAdvanced && (
					<div className="mt-4 flex gap-2">
						<Select value={selectedModel} onValueChange={setSelectedModel}>
							<SelectTrigger className="w-[200px]">
								<SelectValue placeholder="Select model" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={AI_MODELS.GPT_4_TURBO}>GPT-4 Turbo</SelectItem>
								<SelectItem value={AI_MODELS.GPT_4}>GPT-4</SelectItem>
								<SelectItem value={AI_MODELS.GPT_3_5_TURBO}>GPT-3.5 Turbo</SelectItem>
								<SelectItem value={AI_MODELS.CLAUDE_3_OPUS}>Claude 3 Opus</SelectItem>
								<SelectItem value={AI_MODELS.CLAUDE_3_5_SONNET}>Claude 3.5 Sonnet</SelectItem>
								<SelectItem value={AI_MODELS.CLAUDE_3_HAIKU}>Claude 3 Haiku</SelectItem>
								<SelectItem value={AI_MODELS.GEMINI_PRO}>Gemini Pro</SelectItem>
								<SelectItem value={AI_MODELS.GEMINI_1_5_PRO}>Gemini 1.5 Pro</SelectItem>
								<SelectItem value={AI_MODELS.GEMINI_1_5_FLASH}>Gemini 1.5 Flash</SelectItem>
							</SelectContent>
						</Select>

						<Select
							value={selectedProvider || "auto"}
							onValueChange={(v) => setSelectedProvider(v === "auto" ? undefined : v)}
						>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Provider" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="auto">Auto</SelectItem>
								<SelectItem value="openai">OpenAI</SelectItem>
								<SelectItem value="anthropic">Anthropic</SelectItem>
								<SelectItem value="google">Google AI</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</CardHeader>

			<CardContent className="flex-1 flex flex-col p-0">
				<ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
					<div className="space-y-4 py-4">
						{userMessages.length === 0 && (
							<div className="text-center text-muted-foreground py-8">
								Start a conversation with AI
							</div>
						)}

						{userMessages.map((message, index) => (
							<div
								key={index}
								className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
							>
								<div
									className={cn(
										"max-w-[80%] rounded-lg px-4 py-2",
										message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
									)}
								>
									<p className="whitespace-pre-wrap">{message.content}</p>

									{message.tool_calls && message.tool_calls.length > 0 && (
										<div className="mt-2 space-y-1">
											{message.tool_calls.map((toolCall, toolIndex) => (
												<Badge key={toolIndex} variant="secondary" className="text-xs">
													{toolCall.function.name}
												</Badge>
											))}
										</div>
									)}
								</div>
							</div>
						))}

						{error && (
							<div className="flex justify-center">
								<div className="max-w-[80%] rounded-lg px-4 py-2 bg-destructive/10 text-destructive">
									<p className="text-sm">Error: {error.message}</p>
								</div>
							</div>
						)}

						{isLoading && (
							<div className="flex justify-start">
								<div className="bg-muted rounded-lg px-4 py-2">
									<Loader2 className="h-4 w-4 animate-spin" />
								</div>
							</div>
						)}
					</div>
				</ScrollArea>

				<div className="flex-shrink-0 border-t p-4">
					<div className="flex gap-2">
						<Textarea
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Type a message..."
							className="min-h-[60px] flex-1 resize-none"
							disabled={isLoading}
						/>
						<div className="flex flex-col gap-2">
							{isLoading ? (
								<Button onClick={stop} variant="destructive" size="icon">
									<StopCircle className="h-4 w-4" />
								</Button>
							) : (
								<Button onClick={() => sendMessage()} disabled={!input.trim()} size="icon">
									<Send className="h-4 w-4" />
								</Button>
							)}
							<Button
								onClick={reload}
								variant="outline"
								size="icon"
								disabled={userMessages.length < 2 || isLoading}
							>
								<RefreshCw className="h-4 w-4" />
							</Button>
							<Button
								onClick={clear}
								variant="outline"
								size="icon"
								disabled={userMessages.length === 0 || isLoading}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
