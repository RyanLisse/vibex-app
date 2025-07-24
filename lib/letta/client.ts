/**
 * Letta API Client
 *
 * Provides a robust client for interacting with the Letta API,
 * including agent management, message processing, and error handling.
 */

import { z } from "zod";

// Configuration schemas
export const LettaConfigSchema = z.object({
	apiKey: z.string().min(1, "API key is required"),
	baseUrl: z.string().url().default("https://api.letta.com"),
	projectId: z.string().optional(),
	timeout: z.number().default(30000),
	maxRetries: z.number().default(3),
	retryDelay: z.number().default(1000),
});

export type LettaConfig = z.infer<typeof LettaConfigSchema>;

// Message schemas
export const MessageSchema = z.object({
	id: z.string(),
	role: z.enum(["user", "assistant", "system", "tool"]),
	content: z.string(),
	timestamp: z.date(),
	metadata: z.record(z.string(), z.any()).optional(),
	agentId: z.string().optional(),
	sessionId: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// Agent schemas
export const AgentSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	persona: z.string().optional(),
	human: z.string().optional(),
	system: z.string().optional(),
	tools: z.array(z.string()).default([]),
	memory: z.record(z.string(), z.any()).default({}),
	metadata: z.record(z.string(), z.any()).default({}),
	created_at: z.string(),
	last_updated_at: z.string(),
});

export type Agent = z.infer<typeof AgentSchema>;

// Error types
export class LettaError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode?: number,
		public details?: any
	) {
		super(message);
		this.name = "LettaError";
	}
}

export class LettaAPIError extends LettaError {
	constructor(message: string, statusCode: number, details?: any) {
		super(message, "API_ERROR", statusCode, details);
		this.name = "LettaAPIError";
	}
}

export class LettaTimeoutError extends LettaError {
	constructor(message = "Request timed out") {
		super(message, "TIMEOUT", undefined);
		this.name = "LettaTimeoutError";
	}
}

// Request/Response types
export interface CreateAgentRequest {
	name: string;
	description?: string;
	persona?: string;
	human?: string;
	system?: string;
	tools?: string[];
	metadata?: Record<string, any>;
}

export interface SendMessageRequest {
	agent_id: string;
	message: string;
	role?: "user" | "system";
	stream?: boolean;
	return_message_object?: boolean;
}

export interface SendMessageResponse {
	messages: Message[];
	usage?: {
		completion_tokens: number;
		prompt_tokens: number;
		total_tokens: number;
	};
}

/**
 * Letta API Client with comprehensive error handling and retry logic
 */
export class LettaClient {
	private config: LettaConfig;
	private abortController: AbortController | null = null;

	constructor(config: Partial<LettaConfig>) {
		this.config = LettaConfigSchema.parse(config);
	}

	/**
	 * Create a new agent
	 */
	async createAgent(request: CreateAgentRequest): Promise<Agent> {
		return this.request<Agent>("POST", "/v1/agents", request);
	}

	/**
	 * Get an agent by ID
	 */
	async getAgent(agentId: string): Promise<Agent> {
		return this.request<Agent>("GET", `/v1/agents/${agentId}`);
	}

	/**
	 * List all agents
	 */
	async listAgents(): Promise<Agent[]> {
		const response = await this.request<{ agents: Agent[] }>("GET", "/v1/agents");
		return response.agents || [];
	}

	/**
	 * Update an agent
	 */
	async updateAgent(agentId: string, updates: Partial<CreateAgentRequest>): Promise<Agent> {
		return this.request<Agent>("PATCH", `/v1/agents/${agentId}`, updates);
	}

	/**
	 * Delete an agent
	 */
	async deleteAgent(agentId: string): Promise<void> {
		await this.request<void>("DELETE", `/v1/agents/${agentId}`);
	}

	/**
	 * Send a message to an agent
	 */
	async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
		const endpoint = `/v1/agents/${request.agent_id}/messages`;

		if (request.stream) {
			// Handle streaming response
			return this.streamMessage(endpoint, request);
		}

		return this.request<SendMessageResponse>("POST", endpoint, {
			message: request.message,
			role: request.role || "user",
			return_message_object: request.return_message_object ?? true,
		});
	}

	/**
	 * Send a message with streaming response
	 */
	async sendStreamingMessage(
		agentId: string,
		message: string,
		role: "user" | "system" = "user"
	): Promise<ReadableStream<Message>> {
		const endpoint = `/v1/agents/${agentId}/messages`;
		const response = await this.fetchWithRetry(endpoint, {
			method: "POST",
			body: JSON.stringify({
				message,
				role,
				stream: true,
				return_message_object: true,
			}),
		});

		if (!response.body) {
			throw new LettaAPIError("No response body for streaming request", response.status);
		}

		return new ReadableStream({
			async start(controller) {
				const reader = response.body!.getReader();
				const decoder = new TextDecoder();

				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						const lines = chunk.split("\n").filter((line) => line.trim());

						for (const line of lines) {
							if (line.startsWith("data: ")) {
								const data = line.slice(6);
								if (data === "[DONE]") {
									controller.close();
									return;
								}

								try {
									const parsed = JSON.parse(data);
									const message = MessageSchema.parse({
										...parsed,
										timestamp: new Date(parsed.timestamp || Date.now()),
									});
									controller.enqueue(message);
								} catch (error) {
									console.warn("Failed to parse streaming message:", error);
								}
							}
						}
					}
				} catch (error) {
					controller.error(error);
				} finally {
					reader.releaseLock();
				}
			},
		});
	}

	/**
	 * Get agent memory
	 */
	async getAgentMemory(agentId: string): Promise<Record<string, any>> {
		const response = await this.request<{ memory: Record<string, any> }>(
			"GET",
			`/v1/agents/${agentId}/memory`
		);
		return response.memory || {};
	}

	/**
	 * Update agent memory
	 */
	async updateAgentMemory(agentId: string, memory: Record<string, any>): Promise<void> {
		await this.request<void>("POST", `/v1/agents/${agentId}/memory`, { memory });
	}

	/**
	 * Get conversation history
	 */
	async getMessages(
		agentId: string,
		options: {
			limit?: number;
			before?: string;
			after?: string;
		} = {}
	): Promise<Message[]> {
		const params = new URLSearchParams();
		if (options.limit) params.set("limit", options.limit.toString());
		if (options.before) params.set("before", options.before);
		if (options.after) params.set("after", options.after);

		const endpoint = `/v1/agents/${agentId}/messages?${params}`;
		const response = await this.request<{ messages: Message[] }>("GET", endpoint);

		return (response.messages || []).map((msg) => ({
			...msg,
			timestamp: new Date(msg.timestamp),
		}));
	}

	/**
	 * Cancel ongoing request
	 */
	cancel(): void {
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
	}

	/**
	 * Check if client is healthy
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.request<{ status: string }>("GET", "/v1/health");
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Private method to handle streaming messages
	 */
	private async streamMessage(
		endpoint: string,
		request: SendMessageRequest
	): Promise<SendMessageResponse> {
		const stream = await this.sendStreamingMessage(request.agent_id, request.message, request.role);

		const messages: Message[] = [];
		const reader = stream.getReader();

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				messages.push(value);
			}
		} finally {
			reader.releaseLock();
		}

		return { messages };
	}

	/**
	 * Core request method with error handling and retries
	 */
	private async request<T>(method: string, endpoint: string, body?: any): Promise<T> {
		return this.fetchWithRetry(endpoint, {
			method,
			body: body ? JSON.stringify(body) : undefined,
		}).then((response) => response.json());
	}

	/**
	 * Fetch with retry logic and error handling
	 */
	private async fetchWithRetry(
		endpoint: string,
		options: RequestInit,
		attempt = 1
	): Promise<Response> {
		this.abortController = new AbortController();

		const url = `${this.config.baseUrl}${endpoint}`;
		const requestOptions: RequestInit = {
			...options,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.config.apiKey}`,
				...(this.config.projectId && {
					"X-Project-ID": this.config.projectId,
				}),
				...options.headers,
			},
			signal: this.abortController.signal,
		};

		// Add timeout
		const timeoutId = setTimeout(() => {
			this.abortController?.abort();
		}, this.config.timeout);

		try {
			const response = await fetch(url, requestOptions);
			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorText = await response.text().catch(() => "Unknown error");

				// Retry on server errors
				if (response.status >= 500 && attempt < this.config.maxRetries) {
					await this.delay(this.config.retryDelay * attempt);
					return this.fetchWithRetry(endpoint, options, attempt + 1);
				}

				// Retry on rate limit
				if (response.status === 429 && attempt < this.config.maxRetries) {
					const retryAfter = response.headers.get("Retry-After");
					const delay = retryAfter
						? Number.parseInt(retryAfter) * 1000
						: this.config.retryDelay * attempt;

					await this.delay(delay);
					return this.fetchWithRetry(endpoint, options, attempt + 1);
				}

				throw new LettaAPIError(`HTTP ${response.status}: ${errorText}`, response.status, {
					endpoint,
					method: options.method,
				});
			}

			return response;
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof LettaAPIError) {
				throw error;
			}

			if (error instanceof DOMException && error.name === "AbortError") {
				throw new LettaTimeoutError(`Request to ${endpoint} timed out`);
			}

			// Retry on network errors
			if (attempt < this.config.maxRetries) {
				await this.delay(this.config.retryDelay * attempt);
				return this.fetchWithRetry(endpoint, options, attempt + 1);
			}

			throw new LettaError(
				`Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
				"NETWORK_ERROR"
			);
		}
	}

	/**
	 * Delay helper for retries
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Get client configuration
	 */
	getConfig(): LettaConfig {
		return { ...this.config };
	}

	/**
	 * Update client configuration
	 */
	updateConfig(updates: Partial<LettaConfig>): void {
		this.config = LettaConfigSchema.parse({ ...this.config, ...updates });
	}
}

// Factory function for creating client instances
export function createLettaClient(config: Partial<LettaConfig>): LettaClient {
	return new LettaClient(config);
}

// Default client instance (can be configured via environment variables)
let defaultClient: LettaClient | null = null;

export function getDefaultLettaClient(): LettaClient {
	if (!defaultClient) {
		defaultClient = createLettaClient({
			apiKey: process.env.LETTA_API_KEY || "",
			baseUrl: process.env.LETTA_BASE_URL,
			projectId: process.env.LETTA_PROJECT_ID,
		});
	}
	return defaultClient;
}

export function setDefaultLettaClient(client: LettaClient): void {
	defaultClient = client;
}
