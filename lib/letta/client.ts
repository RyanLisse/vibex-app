import { z } from "zod";

// Letta API Configuration
export const LettaConfigSchema = z.object({
	apiKey: z.string().min(1, "API key is required"),
	baseUrl: z.string().default("https://api.letta.com"),
	projectId: z.string().optional(),
});

export type LettaConfig = z.infer<typeof LettaConfigSchema>;

// Agent Types
export const AgentTypeSchema = z.enum([
	"orchestrator",
	"brainstorm",
	"low-latency",
	"memgpt",
	"react",
]);

export type AgentType = z.infer<typeof AgentTypeSchema>;

// Message Types
export const MessageSchema = z.object({
	id: z.string(),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
	timestamp: z.date(),
	agentId: z.string(),
	metadata: z.record(z.string(), z.any()).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Agent Configuration
export const AgentConfigSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: AgentTypeSchema,
	model: z.string().default("gemini-1.5-pro"),
	systemPrompt: z.string(),
	tools: z.array(z.string()).default([]),
	memoryBlocks: z.array(z.string()).default([]),
	voiceEnabled: z.boolean().default(false),
	lowLatency: z.boolean().default(false),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Letta Client
export class LettaClient {
	private config: LettaConfig;
	private baseHeaders: Record<string, string>;

	constructor(config: LettaConfig) {
		this.config = LettaConfigSchema.parse(config);
		this.baseHeaders = {
			Authorization: `Bearer ${this.config.apiKey}`,
			"Content-Type": "application/json",
		};
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.config.baseUrl}${endpoint}`;

		const response = await fetch(url, {
			...options,
			headers: {
				...this.baseHeaders,
				...options.headers,
			},
		});

		if (!response.ok) {
			throw new Error(
				`Letta API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json();
	}

	// Agent Management
	async createAgent(config: AgentConfig): Promise<{ id: string }> {
		return this.request("/agents", {
			method: "POST",
			body: JSON.stringify({
				name: config.name,
				agent_type: config.type,
				llm_config: {
					model: config.model,
					model_endpoint_type: "google",
				},
				system: config.systemPrompt,
				tools: config.tools,
				memory_blocks: config.memoryBlocks,
				metadata: {
					voice_enabled: config.voiceEnabled,
					low_latency: config.lowLatency,
				},
			}),
		});
	}

	async getAgent(agentId: string): Promise<AgentConfig> {
		return this.request(`/agents/${agentId}`);
	}

	async listAgents(): Promise<AgentConfig[]> {
		const response = await this.request<{ agents: AgentConfig[] }>("/agents");
		return response.agents;
	}

	async deleteAgent(agentId: string): Promise<void> {
		await this.request(`/agents/${agentId}`, { method: "DELETE" });
	}

	// Message Handling
	async sendMessage(
		agentId: string,
		message: string,
		streaming = false,
	): Promise<Message | ReadableStream> {
		const endpoint = `/agents/${agentId}/messages`;

		if (streaming) {
			const response = await fetch(`${this.config.baseUrl}${endpoint}/stream`, {
				method: "POST",
				headers: this.baseHeaders,
				body: JSON.stringify({ message, stream: true }),
			});

			if (!response.ok) {
				throw new Error(`Letta API error: ${response.status}`);
			}

			return response.body!;
		}

		return this.request(endpoint, {
			method: "POST",
			body: JSON.stringify({ message }),
		});
	}

	async getMessages(agentId: string, limit = 50): Promise<Message[]> {
		const response = await this.request<{ messages: Message[] }>(
			`/agents/${agentId}/messages?limit=${limit}`,
		);
		return response.messages;
	}

	// Voice Integration
	async createVoiceSession(agentId: string): Promise<{ sessionId: string }> {
		return this.request(`/agents/${agentId}/voice/sessions`, {
			method: "POST",
			body: JSON.stringify({
				voice_config: {
					provider: "google",
					voice_id: "en-US-Neural2-F",
				},
			}),
		});
	}

	async sendVoiceMessage(
		agentId: string,
		sessionId: string,
		audioData: ArrayBuffer,
	): Promise<{ audioResponse: ArrayBuffer; textResponse: string }> {
		const formData = new FormData();
		formData.append("audio", new Blob([audioData], { type: "audio/wav" }));
		formData.append("session_id", sessionId);

		const response = await fetch(
			`${this.config.baseUrl}/agents/${agentId}/voice/messages`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.config.apiKey}`,
				},
				body: formData,
			},
		);

		if (!response.ok) {
			throw new Error(`Voice API error: ${response.status}`);
		}

		const result = await response.json();
		return {
			audioResponse: new Uint8Array(result.audio_response).buffer,
			textResponse: result.text_response,
		};
	}

	// Multi-Agent Communication
	async sendAgentMessage(
		fromAgentId: string,
		toAgentId: string,
		message: string,
	): Promise<Message> {
		return this.request(`/agents/${fromAgentId}/send-to/${toAgentId}`, {
			method: "POST",
			body: JSON.stringify({ message }),
		});
	}

	// Memory Management
	async updateMemory(
		agentId: string,
		blockId: string,
		content: string,
	): Promise<void> {
		await this.request(`/agents/${agentId}/memory/${blockId}`, {
			method: "PUT",
			body: JSON.stringify({ content }),
		});
	}

	async getMemory(agentId: string): Promise<Record<string, string>> {
		return this.request(`/agents/${agentId}/memory`);
	}
}

// Environment Configuration
export function createLettaClient(): LettaClient {
	const config: LettaConfig = {
		apiKey: process.env.LETTA_API_KEY!,
		baseUrl: process.env.LETTA_BASE_URL || "https://api.letta.com",
		projectId: process.env.LETTA_PROJECT_ID,
	};

	return new LettaClient(config);
}
