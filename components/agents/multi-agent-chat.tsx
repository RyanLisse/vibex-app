"use client";

	Brain,
	MessageSquare,
	Mic,
	MicOff,
	Pause,
	Play,
	Send,
	Settings,
	Users,
	Volume2,
	VolumeX,
} from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLogger } from "@/lib/logging";
import { cn } from "@/lib/utils";

const logger = getLogger("multi-agent-chat");

// Types
interface Message {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
	agentId?: string;
	agentName?: string;
}

interface Session {
	id: string;
	userId: string;
	type: "chat" | "voice" | "brainstorm" | "multi-agent";
	status: "active" | "paused" | "completed" | "error";
	activeAgents: string[];
	createdAt: Date;
	updatedAt: Date;
}

interface BrainstormSession {
	id: string;
	topic: string;
	stage: string;
	ideas: Array<{
		id: string;
		content: string;
		category: string;
		score: number;
	}>;
	insights: string[];
	nextSteps: string[];
}

interface MultiAgentChatProps {
	userId: string;
	initialSessionType?: "chat" | "voice" | "brainstorm";
	className?: string;
}

export function MultiAgentChat({
	userId,
	initialSessionType = "chat",
	className,
}: MultiAgentChatProps) {
	// State
	const [session, setSession] = useState<Session | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputMessage, setInputMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [brainstormSession, setBrainstormSession] =
		useState<BrainstormSession | null>(null);
	const [activeTab, setActiveTab] = useState("chat");
	const [systemStatus, setSystemStatus] = useState<any>(null);

	// Voice recording
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
		null,
	);
	const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
	const [isPlayingAudio, setIsPlayingAudio] = useState(false);
	const audioRef = useRef<HTMLAudioElement>(null);

	// Refs
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Initialize session
	useEffect(() => {
		initializeSession();
		fetchSystemStatus();
	}, [userId, initialSessionType, initializeSession]);

	// Auto-scroll messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const initializeSession = useCallback(async () => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/agents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "create_session",
					userId,
					type: initialSessionType,
				}),
			});

			const data = await response.json();
			if (data.success) {
				setSession(data.data.session);
				addSystemMessage(`Session started with ${initialSessionType} mode`);
			}
		} catch (error) {
			logger.error("Failed to initialize session", error as Error);
			addSystemMessage("Failed to initialize session", "error");
		} finally {
			setIsLoading(false);
		}
	}, [userId, initialSessionType]);

	const fetchSystemStatus = async () => {
		try {
			const response = await fetch("/api/agents");
			const data = await response.json();
			if (data.success) {
				setSystemStatus(data.data);
			}
		} catch (error) {
			logger.error("Failed to fetch system status", error as Error);
		}
	};

	const addSystemMessage = (
		content: string,
		type: "info" | "error" = "info",
	) => {
		const message: Message = {
			id: `system_${Date.now()}`,
			role: "system",
			content,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, message]);
	};

	const sendMessage = async (message: string) => {
		if (!(session && message.trim())) return;

		const userMessage: Message = {
			id: `user_${Date.now()}`,
			role: "user",
			content: message,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInputMessage("");
		setIsLoading(true);

		try {
			const response = await fetch("/api/agents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "send_message",
					sessionId: session.id,
					message,
					streaming: false,
				}),
			});

			const data = await response.json();
			if (data.success) {
				const assistantMessage: Message = {
					id: `assistant_${Date.now()}`,
					role: "assistant",
					content: data.data.response.content || "No response",
					timestamp: new Date(),
					agentName: "Orchestrator",
				};
				setMessages((prev) => [...prev, assistantMessage]);
			}
		} catch (error) {
			logger.error("Failed to send message", error as Error);
			addSystemMessage("Failed to send message", "error");
		} finally {
			setIsLoading(false);
		}
	};

	const startBrainstormSession = async (topic: string) => {
		if (!session) return;

		try {
			setIsLoading(true);
			const response = await fetch("/api/agents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "start_brainstorm",
					sessionId: session.id,
					topic,
				}),
			});

			const data = await response.json();
			if (data.success) {
				setBrainstormSession(data.data.brainstormSession);
				setActiveTab("brainstorm");
				addSystemMessage(`Started brainstorming session: ${topic}`);
			}
		} catch (error) {
			logger.error("Failed to start brainstorm session", error as Error);
			addSystemMessage("Failed to start brainstorm session", "error");
		} finally {
			setIsLoading(false);
		}
	};

	const advanceBrainstormStage = async () => {
		if (!session) return;

		try {
			const response = await fetch("/api/agents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "advance_brainstorm_stage",
					sessionId: session.id,
				}),
			});

			const data = await response.json();
			if (data.success) {
				setBrainstormSession(data.data.session);
				addSystemMessage(`Advanced to ${data.data.session.stage} stage`);
			}
		} catch (error) {
			logger.error("Failed to advance brainstorm stage", error as Error);
		}
	};

	// Voice recording functions
	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const recorder = new MediaRecorder(stream);

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					setAudioChunks((prev) => [...prev, event.data]);
				}
			};

			recorder.onstop = () => {
				stream.getTracks().forEach((track) => track.stop());
			};

			setMediaRecorder(recorder);
			recorder.start();
			setIsRecording(true);
		} catch (error) {
			logger.error("Failed to start recording", error as Error);
			addSystemMessage("Failed to start voice recording", "error");
		}
	};

	const stopRecording = () => {
		if (mediaRecorder && isRecording) {
			mediaRecorder.stop();
			setIsRecording(false);
		}
	};

	const sendVoiceMessage = async () => {
		if (!session || audioChunks.length === 0) return;

		try {
			setIsLoading(true);
			const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
			const formData = new FormData();
			formData.append("sessionId", session.id);
			formData.append("audio", audioBlob);

			const response = await fetch("/api/agents/voice", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();
			if (data.success) {
				// Add user voice message
				const userMessage: Message = {
					id: `voice_user_${Date.now()}`,
					role: "user",
					content: "[Voice Message]",
					timestamp: new Date(),
				};
				setMessages((prev) => [...prev, userMessage]);

				// Add assistant response
				const assistantMessage: Message = {
					id: `voice_assistant_${Date.now()}`,
					role: "assistant",
					content: data.data.textResponse,
					timestamp: new Date(),
					agentName: "Orchestrator",
				};
				setMessages((prev) => [...prev, assistantMessage]);

				// Play audio response
				if (data.data.audioResponse) {
					playAudioResponse(data.data.audioResponse);
				}
			}
		} catch (error) {
			logger.error("Failed to send voice message", error as Error);
			addSystemMessage("Failed to process voice message", "error");
		} finally {
			setIsLoading(false);
			setAudioChunks([]);
		}
	};

	const playAudioResponse = (audioBase64: string) => {
		try {
			const audioBlob = new Blob(
				[Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0))],
				{
					type: "audio/wav",
				},
			);

			const audioUrl = URL.createObjectURL(audioBlob);
			if (audioRef.current) {
				audioRef.current.src = audioUrl;
				audioRef.current.play();
				setIsPlayingAudio(true);
			}
		} catch (error) {
			logger.error("Failed to play audio response", error as Error);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage(inputMessage);
		}
	};

	const handleBrainstormTopicSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const formData = new FormData(e.target as HTMLFormElement);
		const topic = formData.get("topic") as string;
		if (topic.trim()) {
			startBrainstormSession(topic.trim());
		}
	};

	return (
		<div className={cn("mx-auto flex h-full max-w-4xl flex-col", className)}>
			<audio
				className="hidden"
				onEnded={() => setIsPlayingAudio(false)}
				ref={audioRef}
			/>

			{/* Header */}
			<Card className="mb-4">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							Multi-Agent System
						</CardTitle>
						<div className="flex items-center gap-2">
							{systemStatus && (
								<>
									<Badge
										variant={systemStatus.initialized ? "default" : "secondary"}
									>
										{systemStatus.initialized ? "Active" : "Initializing"}
									</Badge>
									<Badge variant="outline">
										{systemStatus.activeSessions} Sessions
									</Badge>
								</>
							)}
						</div>
					</div>
				</CardHeader>
			</Card>

			{/* Main Content */}
			<Card className="flex flex-1 flex-col">
				<Tabs
					className="flex flex-1 flex-col"
					onValueChange={setActiveTab}
					value={activeTab}
				>
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger className="flex items-center gap-2" value="chat">
							<MessageSquare className="h-4 w-4" />
							Chat
						</TabsTrigger>
						<TabsTrigger className="flex items-center gap-2" value="brainstorm">
							<Brain className="h-4 w-4" />
							Brainstorm
						</TabsTrigger>
						<TabsTrigger className="flex items-center gap-2" value="settings">
							<Settings className="h-4 w-4" />
							Settings
						</TabsTrigger>
					</TabsList>

					{/* Chat Tab */}
					<TabsContent className="flex flex-1 flex-col" value="chat">
						<ScrollArea className="flex-1 p-4">
							<div className="space-y-4">
								{messages.map((message) => (
									<div
										className={cn(
											"flex",
											message.role === "user" ? "justify-end" : "justify-start",
										)}
										key={message.id}
									>
										<div
											className={cn(
												"max-w-[80%] rounded-lg px-4 py-2",
												message.role === "user"
													? "bg-primary text-primary-foreground"
													: message.role === "system"
														? "bg-muted text-muted-foreground text-sm"
														: "bg-muted",
											)}
										>
											{message.agentName && (
												<div className="mb-1 font-medium text-xs opacity-70">
													{message.agentName}
												</div>
											)}
											<div className="whitespace-pre-wrap">
												{message.content}
											</div>
											<div className="mt-1 text-xs opacity-50">
												{message.timestamp.toLocaleTimeString()}
											</div>
										</div>
									</div>
								))}
								{isLoading && (
									<div className="flex justify-start">
										<div className="rounded-lg bg-muted px-4 py-2">
											<div className="flex items-center gap-2">
												<div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
												Thinking...
											</div>
										</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</div>
						</ScrollArea>

						{/* Input Area */}
						<div className="border-t p-4">
							<div className="flex items-center gap-2">
								<Input
									className="flex-1"
									disabled={isLoading}
									onChange={(e) => setInputMessage(e.target.value)}
									onKeyPress={handleKeyPress}
									placeholder="Type your message..."
									ref={inputRef}
									value={inputMessage}
								/>
								<Button
									disabled={isLoading || !inputMessage.trim()}
									onClick={() => sendMessage(inputMessage)}
									size="icon"
								>
									<Send className="h-4 w-4" />
								</Button>
								<Button
									onClick={isRecording ? stopRecording : startRecording}
									size="icon"
									variant={isRecording ? "destructive" : "outline"}
								>
									{isRecording ? (
										<MicOff className="h-4 w-4" />
									) : (
										<Mic className="h-4 w-4" />
									)}
								</Button>
								{audioChunks.length > 0 && (
									<Button
										disabled={isLoading}
										onClick={sendVoiceMessage}
										size="icon"
										variant="secondary"
									>
										<Send className="h-4 w-4" />
									</Button>
								)}
								<Button
									disabled={!audioRef.current?.src}
									onClick={() => setIsPlayingAudio(!isPlayingAudio)}
									size="icon"
									variant="ghost"
								>
									{isPlayingAudio ? (
										<VolumeX className="h-4 w-4" />
									) : (
										<Volume2 className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>
					</TabsContent>

					{/* Brainstorm Tab */}
					<TabsContent className="flex flex-1 flex-col" value="brainstorm">
						<div className="p-4">
							{brainstormSession ? (
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<h3 className="font-semibold">
												{brainstormSession.topic}
											</h3>
											<Badge variant="outline">{brainstormSession.stage}</Badge>
										</div>
										<Button onClick={advanceBrainstormStage} variant="outline">
											Next Stage
										</Button>
									</div>

									{brainstormSession.ideas.length > 0 && (
										<div>
											<h4 className="mb-2 font-medium">Ideas Generated</h4>
											<div className="space-y-2">
												{brainstormSession.ideas.map((idea) => (
													<Card key={idea.id}>
														<CardContent className="p-3">
															<div className="flex items-center justify-between">
																<span>{idea.content}</span>
																<Badge variant="secondary">
																	{idea.score}/10
																</Badge>
															</div>
														</CardContent>
													</Card>
												))}
											</div>
										</div>
									)}
								</div>
							) : (
								<form
									className="space-y-4"
									onSubmit={handleBrainstormTopicSubmit}
								>
									<div>
										<label className="font-medium text-sm">
											What would you like to brainstorm about?
										</label>
										<Input
											className="mt-1"
											name="topic"
											placeholder="Enter your topic or idea..."
											required
										/>
									</div>
									<Button disabled={isLoading} type="submit">
										Start Brainstorming
									</Button>
								</form>
							)}
						</div>
					</TabsContent>

					{/* Settings Tab */}
					<TabsContent className="flex-1 p-4" value="settings">
						<div className="space-y-4">
							<h3 className="font-semibold">System Status</h3>
							{systemStatus && (
								<div className="grid grid-cols-2 gap-4">
									<Card>
										<CardContent className="p-3">
											<div className="font-medium text-sm">
												Orchestrator Agent
											</div>
											<Badge
												variant={
													systemStatus.agents.orchestrator.status === "active"
														? "default"
														: "secondary"
												}
											>
												{systemStatus.agents.orchestrator.status}
											</Badge>
										</CardContent>
									</Card>
									<Card>
										<CardContent className="p-3">
											<div className="font-medium text-sm">
												Brainstorm Agent
											</div>
											<Badge
												variant={
													systemStatus.agents.brainstorm.status === "active"
														? "default"
														: "secondary"
												}
											>
												{systemStatus.agents.brainstorm.status}
											</Badge>
										</CardContent>
									</Card>
								</div>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</Card>
		</div>
	);
}
