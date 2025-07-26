import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	AgentSchema,
	createLettaClient,
	LettaAPIError,
	LettaClient,
	type LettaConfig,
	LettaConfigSchema,
	MessageSchema,
} from "./client";

// Mock fetch globally

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("LettaClient", () => {
	let client: LettaClient;
	let config: LettaConfig;

	beforeEach(() => {
		config = {
			apiKey: "test-api-key",
			baseUrl: "https://api.test.com",
			projectId: "test-project",
		};
		client = new LettaClient(config);
	});

	describe("Schemas", () => {
		describe("LettaConfigSchema", () => {
			it("should parse valid config", () => {
				const validConfig = {
					apiKey: "test-key",
					baseUrl: "https://custom.api.com",
					projectId: "project-123",
				};
				const parsed = LettaConfigSchema.parse(validConfig);
				expect(parsed).toMatchObject(validConfig);
				expect(parsed.timeout).toBe(30000);
				expect(parsed.maxRetries).toBe(3);
				expect(parsed.retryDelay).toBe(1000);
			});

			it("should use default baseUrl", () => {
				const config = { apiKey: "test-key" };
				const parsed = LettaConfigSchema.parse(config);
				expect(parsed.baseUrl).toBe("https://api.letta.com");
			});

			it("should make projectId optional", () => {
				const config = { apiKey: "test-key" };
				const parsed = LettaConfigSchema.parse(config);
				expect(parsed.projectId).toBeUndefined();
			});
		});

		describe("AgentSchema", () => {
			it("should validate agent data", () => {
				const validAgent = {
					id: "agent-123",
					name: "Test Agent",
					description: "A test agent",
					persona: "Helpful assistant",
					human: "User",
					system: "System message",
					tools: ["web_search"],
					memory: { key: "value" },
					metadata: { type: "test" },
					created_at: new Date().toISOString(),
					last_updated_at: new Date().toISOString(),
				};
				expect(() => AgentSchema.parse(validAgent)).not.toThrow();
			});

			it("should reject invalid agent data", () => {
				expect(() => AgentSchema.parse({ invalid: "data" })).toThrow();
			});
		});

		describe("MessageSchema", () => {
			it("should parse valid message", () => {
				const message = {
					id: "msg-123",
					role: "user" as const,
					content: "Hello world",
					timestamp: new Date(),
					agentId: "agent-123",
					metadata: { key: "value" },
				};
				const parsed = MessageSchema.parse(message);
				expect(parsed).toEqual(message);
			});

			it("should make metadata optional", () => {
				const message = {
					id: "msg-123",
					role: "assistant" as const,
					content: "Response",
					timestamp: new Date(),
					agentId: "agent-123",
				};
				const parsed = MessageSchema.parse(message);
				expect(parsed.metadata).toBeUndefined();
			});
		});

		describe("Agent Configuration", () => {
			it("should parse valid agent config", () => {
				const agentConfig = {
					id: "agent-123",
					name: "Test Agent",
					description: "A helpful assistant",
					persona: "You are a helpful assistant",
					human: "User",
					system: "System context",
					tools: ["web_search"],
					memory: { context: "value" },
					metadata: { model: "gemini-1.5-pro", temperature: 0.7 },
					created_at: new Date().toISOString(),
					last_updated_at: new Date().toISOString(),
				};
				const parsed = AgentSchema.parse(agentConfig);
				expect(parsed).toMatchObject(agentConfig);
			});

			it("should require mandatory fields", () => {
				const minimalConfig = {
					id: "agent-123",
					name: "Test Agent",
				};
				// Should throw because required fields are missing
				expect(() => AgentSchema.parse(minimalConfig)).toThrow();
			});
		});
	});

	describe("constructor", () => {
		it("should create client with valid config", () => {
			expect(client).toBeDefined();
			expect(client).toBeInstanceOf(LettaClient);
		});

		it("should validate config on creation", () => {
			expect(() => new LettaClient({ apiKey: "" })).toThrow();
		});

		it("should store configuration", () => {
			// Access private property for testing
			const storedConfig = (client as any).config;
			expect(storedConfig.apiKey).toBe("test-api-key");
			expect(storedConfig.baseUrl).toBe("https://api.test.com");
			expect(storedConfig.projectId).toBe("test-project");
		});
	});

	describe("request method", () => {
		it("should make successful API request", async () => {
			const mockResponse = { id: "test-123" };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await (client as any).request("GET", "/test-endpoint");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/test-endpoint",
				expect.objectContaining({
					method: "GET",
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
						"Content-Type": "application/json",
						"X-Project-ID": "test-project",
					}),
				})
			);
			expect(result).toEqual(mockResponse);
		});

		it("should throw error on failed request", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				text: () => Promise.resolve("Not Found"),
			});

			await expect((client as any).request("GET", "/invalid-endpoint")).rejects.toThrow(
				LettaAPIError
			);
		});

		it("should include request body in POST requests", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			});

			const body = { data: "test" };
			await (client as any).request("POST", "/test", body);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(body),
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
						"Content-Type": "application/json",
					}),
				})
			);
		});
	});

	describe("createAgent", () => {
		it("should create agent with valid config", async () => {
			const mockResponse = { id: "agent-123" };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const agentConfig = {
				name: "Test Agent",
				description: "A test agent",
				persona: "You are helpful",
				human: "User",
				system: "System context",
				tools: ["web_search"],
				metadata: { type: "orchestrator" },
			};

			const result = await client.createAgent(agentConfig);

			expect(result).toEqual(mockResponse);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/agents",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify(agentConfig),
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
						"Content-Type": "application/json",
						"X-Project-ID": "test-project",
					}),
				})
			);
		});
	});

	describe("getAgent", () => {
		it("should get agent by ID", async () => {
			const mockAgent = {
				id: "agent-123",
				name: "Test Agent",
				description: "Test description",
				persona: "Helper",
				human: "User",
				system: "System",
				tools: [],
				memory: {},
				metadata: {},
				created_at: new Date().toISOString(),
				last_updated_at: new Date().toISOString(),
			};
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAgent),
			});

			const result = await client.getAgent("agent-123");

			expect(result).toEqual(mockAgent);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/agents/agent-123",
				expect.objectContaining({
					method: "GET",
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
						"Content-Type": "application/json",
						"X-Project-ID": "test-project",
					}),
				})
			);
		});
	});

	describe("listAgents", () => {
		it("should list all agents", async () => {
			const mockAgents = [
				{
					id: "agent-1",
					name: "Agent 1",
					description: "First agent",
					persona: "Helper 1",
					human: "User",
					system: "System 1",
					tools: [],
					memory: {},
					metadata: {},
					created_at: new Date().toISOString(),
					last_updated_at: new Date().toISOString(),
				},
				{
					id: "agent-2",
					name: "Agent 2",
					description: "Second agent",
					persona: "Helper 2",
					human: "User",
					system: "System 2",
					tools: ["search"],
					memory: {},
					metadata: {},
					created_at: new Date().toISOString(),
					last_updated_at: new Date().toISOString(),
				},
			];
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ agents: mockAgents }),
			});

			const result = await client.listAgents();

			expect(result).toEqual(mockAgents);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/agents",
				expect.objectContaining({
					method: "GET",
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
					}),
				})
			);
		});
	});

	describe("deleteAgent", () => {
		it("should delete agent by ID", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({}),
			});

			await client.deleteAgent("agent-123");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/agents/agent-123",
				expect.objectContaining({
					method: "DELETE",
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
						"Content-Type": "application/json",
						"X-Project-ID": "test-project",
					}),
				})
			);
		});
	});

	describe("sendMessage", () => {
		it("should send regular message", async () => {
			const mockResponse = {
				messages: [
					{
						id: "msg-123",
						role: "assistant",
						content: "Hello back!",
						timestamp: new Date(),
						agentId: "agent-123",
					},
				],
				usage: {
					completion_tokens: 10,
					prompt_tokens: 5,
					total_tokens: 15,
				},
			};
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			});

			const result = await client.sendMessage({
				agent_id: "agent-123",
				message: "Hello!",
				role: "user",
			});

			expect(result).toEqual(mockResponse);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/agents/agent-123/messages",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ message: "Hello!", role: "user" }),
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
					}),
				})
			);
		});

		it("should send streaming message", async () => {
			const mockStream = new ReadableStream();
			mockFetch.mockResolvedValueOnce({
				ok: true,
				body: mockStream,
			});

			const resultPromise = client.sendMessage({
				agent_id: "agent-123",
				message: "Hello!",
				stream: true,
			});

			// For streaming, it should return a promise that resolves to a response
			await expect(resultPromise).resolves.toBeDefined();
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/agents/agent-123/messages",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ message: "Hello!", stream: true }),
				})
			);
		});

		it("should throw error on streaming failure", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				text: () => Promise.resolve("Internal Server Error"),
			});

			await expect(
				client.sendMessage({
					agent_id: "agent-123",
					message: "Hello!",
					stream: true,
				})
			).rejects.toThrow(LettaAPIError);
		});
	});

	describe("getMessages", () => {
		it("should get messages with default limit", async () => {
			const mockMessages: Message[] = [
				{
					id: "msg-1",
					role: "user",
					content: "Hello",
					timestamp: new Date(),
					agentId: "agent-123",
				},
				{
					id: "msg-2",
					role: "assistant",
					content: "Hi there!",
					timestamp: new Date(),
					agentId: "agent-123",
				},
			];
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ messages: mockMessages }),
			});

			const result = await client.getMessages("agent-123");

			expect(result).toEqual(mockMessages);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/agents/agent-123/messages",
				expect.objectContaining({
					method: "GET",
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
					}),
				})
			);
		});

		it("should get messages with custom limit", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ messages: [] }),
			});

			await client.getMessages("agent-123", { limit: 10 });

			expect(mockFetch).toHaveBeenCalledWith(
				"https://api.test.com/v1/agents/agent-123/messages?limit=10",
				expect.objectContaining({
					method: "GET",
					headers: expect.objectContaining({
						Authorization: "Bearer test-api-key",
					}),
				})
			);
		});
	});

	describe("createLettaClient", () => {
		it("should use createLettaClient function", () => {
			// Set environment variables for this test
			const originalApiKey = process.env.LETTA_API_KEY;
			const originalBaseUrl = process.env.LETTA_BASE_URL;

			process.env.LETTA_API_KEY = "env-api-key";
			process.env.LETTA_BASE_URL = "https://env.api.com";

			try {
				const client = createLettaClient();
				expect(client).toBeInstanceOf(LettaClient);
			} finally {
				// Restore original values
				if (originalApiKey !== undefined) {
					process.env.LETTA_API_KEY = originalApiKey;
				} else {
					delete process.env.LETTA_API_KEY;
				}
				if (originalBaseUrl !== undefined) {
					process.env.LETTA_BASE_URL = originalBaseUrl;
				} else {
					delete process.env.LETTA_BASE_URL;
				}
			}
		});
	});
});
