/**
 * Brainstorm Agent
 *
 * Specialized agent for creative ideation, problem-solving, and generating
 * innovative solutions through structured brainstorming methodologies.
 */

import { logger } from "@/lib/logging";
import { observability } from "@/lib/observability";
import type { Agent, CreateAgentRequest, LettaClient, Message } from "../client";

export interface BrainstormSession {
	id: string;
	topic: string;
	description: string;
	participants: string[];
	ideas: BrainstormIdea[];
	status: "active" | "paused" | "completed" | "cancelled";
	createdAt: Date;
	updatedAt: Date;
	metadata: Record<string, unknown>;
}

export interface BrainstormIdea {
	id: string;
	content: string;
	category: string;
	tags: string[];
	score: number;
	votes: number;
	author: string;
	createdAt: Date;
	refinements: string[];
	relatedIdeas: string[];
}

export interface BrainstormConfig {
	maxIdeasPerSession: number;
	sessionTimeout: number;
	ideaGenerationMethods: string[];
	evaluationCriteria: string[];
}

export interface BrainstormResult {
	sessionId: string;
	totalIdeas: number;
	topIdeas: BrainstormIdea[];
	categories: Record<string, number>;
	insights: string[];
	recommendations: string[];
}

export class BrainstormAgent {
	private client: LettaClient;
	private agentId: string | null = null;
	private activeSessions = new Map<string, BrainstormSession>();
	private config: BrainstormConfig;
	private logger = logger.child({ component: "BrainstormAgent" });

	constructor(client: LettaClient, config: Partial<BrainstormConfig> = {}) {
		this.client = client;
		this.config = {
			maxIdeasPerSession: 100,
			sessionTimeout: 3600000, // 1 hour
			ideaGenerationMethods: [
				"free_association",
				"mind_mapping",
				"scamper",
				"six_thinking_hats",
				"brainwriting",
				"reverse_brainstorming",
			],
			evaluationCriteria: [
				"feasibility",
				"innovation",
				"impact",
				"cost_effectiveness",
				"time_to_implement",
			],
			...config,
		};
	}

	/**
	 * Initialize the brainstorm agent
	 */
	async initialize(): Promise<void> {
		try {
			this.logger.info("Initializing brainstorm agent");

			// Create the brainstorm agent in Letta
			const agentRequest: CreateAgentRequest = {
				name: "Brainstorm",
				description:
					"Creative ideation specialist focused on generating innovative solutions and facilitating productive brainstorming sessions",
				persona:
					"You are a creative and innovative brainstorming facilitator. You excel at generating diverse ideas, thinking outside the box, and helping others explore creative solutions. You use various brainstorming techniques and encourage wild ideas while maintaining focus on the objective.",
				system:
					"You are a brainstorming agent specialized in creative ideation. Your role is to:\n1. Generate creative and innovative ideas\n2. Facilitate structured brainstorming sessions\n3. Apply various ideation techniques (SCAMPER, mind mapping, etc.)\n4. Encourage divergent thinking and build on ideas\n5. Evaluate and categorize ideas effectively\n6. Provide insights and recommendations based on generated ideas",
				tools: ["idea_generator", "mind_mapper", "idea_evaluator", "session_manager"],
				metadata: {
					type: "brainstorm",
					version: "1.0.0",
					capabilities: ["creative_ideation", "problem_solving", "innovation", "facilitation"],
					methods: this.config.ideaGenerationMethods,
				},
			};

			const agent = await this.client.createAgent(agentRequest);
			this.agentId = agent.id;

			this.logger.info("Brainstorm agent initialized", { agentId: this.agentId });
			observability.recordEvent("brainstorm.initialized", { agentId: this.agentId });
		} catch (error) {
			this.logger.error("Failed to initialize brainstorm agent", { error });
			observability.recordError("brainstorm.init_failed", error as Error);
			throw error;
		}
	}

	/**
	 * Start a new brainstorming session
	 */
	async startSession(
		topic: string,
		description: string,
		participants: string[] = []
	): Promise<string> {
		try {
			const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			const session: BrainstormSession = {
				id: sessionId,
				topic,
				description,
				participants,
				ideas: [],
				status: "active",
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {},
			};

			this.activeSessions.set(sessionId, session);

			this.logger.info("Brainstorm session started", { sessionId, topic });
			observability.recordEvent("brainstorm.session_started", { sessionId, topic });

			// Initialize session with agent
			if (this.agentId) {
				await this.client.sendMessage({
					agent_id: this.agentId,
					message: `Starting new brainstorming session:
Topic: ${topic}
Description: ${description}
Participants: ${participants.join(", ") || "Solo session"}

Please prepare for creative ideation on this topic. What initial thoughts or questions do you have?`,
					role: "user",
				});
			}

			return sessionId;
		} catch (error) {
			this.logger.error("Failed to start brainstorm session", { error });
			throw error;
		}
	}

	/**
	 * Generate ideas for a session using various techniques
	 */
	async generateIdeas(
		sessionId: string,
		method = "free_association",
		count = 10
	): Promise<BrainstormIdea[]> {
		try {
			const session = this.activeSessions.get(sessionId);
			if (!session) {
				throw new Error("Session not found");
			}

			if (!this.agentId) {
				throw new Error("Agent not initialized");
			}

			this.logger.info("Generating ideas", { sessionId, method, count });

			const prompt = this.buildIdeaGenerationPrompt(session, method, count);
			const response = await this.client.sendMessage({
				agent_id: this.agentId,
				message: prompt,
				role: "user",
			});

			// Parse ideas from response
			const ideas = this.parseIdeasFromResponse(response.messages, sessionId);

			// Add ideas to session
			session.ideas.push(...ideas);
			session.updatedAt = new Date();

			this.logger.info("Ideas generated", { sessionId, count: ideas.length });
			observability.recordEvent("brainstorm.ideas_generated", {
				sessionId,
				method,
				count: ideas.length,
			});

			return ideas;
		} catch (error) {
			this.logger.error("Failed to generate ideas", { sessionId, error });
			throw error;
		}
	}

	/**
	 * Evaluate and score ideas in a session
	 */
	async evaluateIdeas(sessionId: string): Promise<BrainstormIdea[]> {
		try {
			const session = this.activeSessions.get(sessionId);
			if (!session) {
				throw new Error("Session not found");
			}

			if (!this.agentId) {
				throw new Error("Agent not initialized");
			}

			this.logger.info("Evaluating ideas", { sessionId, ideaCount: session.ideas.length });

			const prompt = this.buildEvaluationPrompt(session);
			const response = await this.client.sendMessage({
				agent_id: this.agentId,
				message: prompt,
				role: "user",
			});

			// Update idea scores based on evaluation
			const evaluatedIdeas = this.parseEvaluationFromResponse(response.messages, session.ideas);

			// Sort ideas by score
			evaluatedIdeas.sort((a, b) => b.score - a.score);

			session.ideas = evaluatedIdeas;
			session.updatedAt = new Date();

			this.logger.info("Ideas evaluated", { sessionId, topScore: evaluatedIdeas[0]?.score });
			observability.recordEvent("brainstorm.ideas_evaluated", { sessionId });

			return evaluatedIdeas;
		} catch (error) {
			this.logger.error("Failed to evaluate ideas", { sessionId, error });
			throw error;
		}
	}

	/**
	 * Complete a brainstorming session and generate results
	 */
	async completeSession(sessionId: string): Promise<BrainstormResult> {
		try {
			const session = this.activeSessions.get(sessionId);
			if (!session) {
				throw new Error("Session not found");
			}

			session.status = "completed";
			session.updatedAt = new Date();

			// Evaluate ideas if not already done
			if (session.ideas.some((idea) => idea.score === 0)) {
				await this.evaluateIdeas(sessionId);
			}

			// Generate insights and recommendations
			const insights = await this.generateInsights(session);
			const recommendations = await this.generateRecommendations(session);

			// Categorize ideas
			const categories: Record<string, number> = {};
			session.ideas.forEach((idea) => {
				categories[idea.category] = (categories[idea.category] || 0) + 1;
			});

			const result: BrainstormResult = {
				sessionId,
				totalIdeas: session.ideas.length,
				topIdeas: session.ideas.slice(0, 10),
				categories,
				insights,
				recommendations,
			};

			this.logger.info("Session completed", { sessionId, totalIdeas: result.totalIdeas });
			observability.recordEvent("brainstorm.session_completed", {
				sessionId,
				totalIdeas: result.totalIdeas,
			});

			return result;
		} catch (error) {
			this.logger.error("Failed to complete session", { sessionId, error });
			throw error;
		}
	}

	/**
	 * Get session status and details
	 */
	getSession(sessionId: string): BrainstormSession | null {
		return this.activeSessions.get(sessionId) || null;
	}

	/**
	 * Get all active sessions
	 */
	getActiveSessions(): BrainstormSession[] {
		return Array.from(this.activeSessions.values());
	}

	/**
	 * Cancel a session
	 */
	async cancelSession(sessionId: string): Promise<void> {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.status = "cancelled";
			session.updatedAt = new Date();
			this.logger.info("Session cancelled", { sessionId });
		}
	}

	/**
	 * Build idea generation prompt based on method
	 */
	private buildIdeaGenerationPrompt(
		session: BrainstormSession,
		method: string,
		count: number
	): string {
		const basePrompt = `Generate ${count} creative ideas for the following topic using the ${method} technique:

Topic: ${session.topic}
Description: ${session.description}
Existing ideas: ${session.ideas.length}

`;

		const methodPrompts = {
			free_association:
				"Use free association to generate ideas. Let your mind wander and connect concepts freely.",
			mind_mapping:
				"Create a mind map structure and generate ideas from different branches and connections.",
			scamper:
				"Use the SCAMPER technique (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse).",
			six_thinking_hats:
				"Apply the Six Thinking Hats method, considering different perspectives (facts, emotions, caution, optimism, creativity, process).",
			brainwriting: "Generate ideas silently and systematically, building on previous thoughts.",
			reverse_brainstorming:
				"Think about how to cause the opposite of what you want, then reverse those ideas.",
		};

		return (
			basePrompt +
			(methodPrompts[method as keyof typeof methodPrompts] || methodPrompts.free_association) +
			"\n\nPlease provide each idea in the format: IDEA: [content] | CATEGORY: [category] | TAGS: [tag1, tag2, tag3]"
		);
	}

	/**
	 * Build evaluation prompt for ideas
	 */
	private buildEvaluationPrompt(session: BrainstormSession): string {
		return `Evaluate the following ideas for the brainstorming session on "${session.topic}":

${session.ideas.map((idea, index) => `${index + 1}. ${idea.content} (Category: ${idea.category})`).join("\n")}

Please evaluate each idea based on these criteria: ${this.config.evaluationCriteria.join(", ")}.
Provide a score from 1-10 for each idea and brief reasoning.

Format: IDEA_${index + 1}: [score] | REASONING: [brief explanation]`;
	}

	/**
	 * Parse ideas from agent response
	 */
	private parseIdeasFromResponse(messages: Message[], sessionId: string): BrainstormIdea[] {
		const ideas: BrainstormIdea[] = [];

		for (const message of messages) {
			if (message.role === "assistant") {
				const ideaMatches = message.content.match(
					/IDEA:\s*([^|]+)\s*\|\s*CATEGORY:\s*([^|]+)\s*\|\s*TAGS:\s*([^|]+)/g
				);

				if (ideaMatches) {
					for (const match of ideaMatches) {
						const parts = match.split("|");
						if (parts.length >= 3) {
							const content = parts[0].replace("IDEA:", "").trim();
							const category = parts[1].replace("CATEGORY:", "").trim();
							const tags = parts[2]
								.replace("TAGS:", "")
								.trim()
								.split(",")
								.map((tag) => tag.trim());

							ideas.push({
								id: `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
								content,
								category,
								tags,
								score: 0,
								votes: 0,
								author: "brainstorm_agent",
								createdAt: new Date(),
								refinements: [],
								relatedIdeas: [],
							});
						}
					}
				}
			}
		}

		return ideas;
	}

	/**
	 * Parse evaluation results from agent response
	 */
	private parseEvaluationFromResponse(
		messages: Message[],
		ideas: BrainstormIdea[]
	): BrainstormIdea[] {
		const evaluatedIdeas = [...ideas];

		for (const message of messages) {
			if (message.role === "assistant") {
				const scoreMatches = message.content.match(/IDEA_(\d+):\s*(\d+(?:\.\d+)?)/g);

				if (scoreMatches) {
					for (const match of scoreMatches) {
						const [, indexStr, scoreStr] = match.match(/IDEA_(\d+):\s*(\d+(?:\.\d+)?)/) || [];
						if (indexStr && scoreStr) {
							const index = Number.parseInt(indexStr) - 1;
							const score = Number.parseFloat(scoreStr);

							if (index >= 0 && index < evaluatedIdeas.length) {
								evaluatedIdeas[index].score = score;
							}
						}
					}
				}
			}
		}

		return evaluatedIdeas;
	}

	/**
	 * Generate insights from session
	 */
	private async generateInsights(session: BrainstormSession): Promise<string[]> {
		if (!this.agentId) return [];

		const prompt = `Analyze the brainstorming session and provide key insights:

Topic: ${session.topic}
Total Ideas: ${session.ideas.length}
Top Ideas: ${session.ideas
			.slice(0, 5)
			.map((idea) => idea.content)
			.join(", ")}

What patterns, themes, or insights do you notice? Provide 3-5 key insights.`;

		try {
			const response = await this.client.sendMessage({
				agent_id: this.agentId,
				message: prompt,
				role: "user",
			});

			return this.parseListFromResponse(response.messages, "INSIGHT:");
		} catch (error) {
			this.logger.error("Failed to generate insights", { error });
			return [];
		}
	}

	/**
	 * Generate recommendations from session
	 */
	private async generateRecommendations(session: BrainstormSession): Promise<string[]> {
		if (!this.agentId) return [];

		const prompt = `Based on the brainstorming session results, provide actionable recommendations:

Topic: ${session.topic}
Best Ideas: ${session.ideas
			.slice(0, 3)
			.map((idea) => `${idea.content} (Score: ${idea.score})`)
			.join(", ")}

What are the next steps? Provide 3-5 specific recommendations for moving forward.`;

		try {
			const response = await this.client.sendMessage({
				agent_id: this.agentId,
				message: prompt,
				role: "user",
			});

			return this.parseListFromResponse(response.messages, "RECOMMENDATION:");
		} catch (error) {
			this.logger.error("Failed to generate recommendations", { error });
			return [];
		}
	}

	/**
	 * Parse list items from response
	 */
	private parseListFromResponse(messages: Message[], prefix: string): string[] {
		const items: string[] = [];

		for (const message of messages) {
			if (message.role === "assistant") {
				const matches = message.content.match(new RegExp(`${prefix}\\s*([^\\n]+)`, "g"));
				if (matches) {
					for (const match of matches) {
						const item = match.replace(prefix, "").trim();
						if (item) {
							items.push(item);
						}
					}
				}
			}
		}

		return items;
	}
}

// Factory function
export function createBrainstormAgent(
	client: LettaClient,
	config?: Partial<BrainstormConfig>
): BrainstormAgent {
	return new BrainstormAgent(client, config);
}

export default BrainstormAgent;
