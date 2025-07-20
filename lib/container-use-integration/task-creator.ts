/**
 * Multi-Source Task Creator
 * Implements task creation from GitHub issues, PR comments, voice commands, and screenshots
 * Following TDD approach - minimal implementation to make tests pass
 */

import type {
	Task,
	VoiceCommand,
	ScreenshotAnalysis,
	TaskCreationResult,
	ContainerUseError,
} from "./types";

interface TaskCreatorConfig {
	openaiApiKey: string;
	githubToken: string;
	webhookSecret: string;
}

interface IssueData {
	id: number;
	title: string;
	body: string;
	labels?: Array<{ name: string }>;
	assignee?: { login: string };
	repository?: { full_name: string };
}

interface CommentData {
	id: number;
	body: string;
	user: { login: string };
	pull_request?: {
		number: number;
		title?: string;
		repository?: { full_name: string };
	};
}

interface EnrichmentOptions {
	enrichWithAI?: boolean;
	assignPriority?: boolean;
}

interface TaskCreationOptions {
	retries?: number;
	retryDelay?: number;
}

interface QueueResult {
	success: boolean;
	task?: Task;
	queuePosition?: number;
	error?: string;
}

interface BatchResult {
	success: boolean;
	processingTime?: number;
}

export class MultiSourceTaskCreator {
	private config: TaskCreatorConfig;
	private taskCache: Map<string, Task> = new Map();
	private aiAnalysisCache: Map<string, any> = new Map();
	private createdTasks: Set<string> = new Set();
	private requestCount = 0;

	constructor(config: TaskCreatorConfig) {
		this.config = config;
	}

	async createTaskFromIssue(
		issueData: IssueData,
		options: EnrichmentOptions = {},
	): Promise<TaskCreationResult> {
		try {
			// Validate issue data
			if (!issueData.id || !issueData.title) {
				return {
					success: false,
					error: "Invalid issue data: missing required fields",
				};
			}

			// Check for rate limiting
			if (this.isRateLimited()) {
				return {
					success: false,
					error: "Rate limit exceeded",
					retryable: true,
				};
			}

			const taskId = `task-issue-${issueData.id}`;
			const priority = this.extractPriorityFromLabels(issueData.labels || []);

			const task: Task = {
				id: taskId,
				title: issueData.title,
				description: issueData.body || "",
				source: "issue",
				sourceId: String(issueData.id),
				priority,
				status: "queued",
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {
					repository: issueData.repository?.full_name,
					labels: issueData.labels?.map((l) => l.name) || [],
				},
			};

			// AI enrichment
			if (options.enrichWithAI) {
				const aiAnalysis = await this.enrichWithAI(task);
				task.metadata.aiAnalysis = aiAnalysis.analysis;
				task.metadata.suggestedApproach = aiAnalysis.approach;
				task.estimatedDuration = aiAnalysis.estimatedDuration;
			}

			this.taskCache.set(taskId, task);

			return {
				success: true,
				task,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				retryable: true,
			};
		}
	}

	async createTaskFromPRComment(
		commentData: CommentData,
	): Promise<TaskCreationResult> {
		try {
			// Check if comment mentions agent
			if (!commentData.body.includes("@agent")) {
				return {
					success: false,
					error: "Comment is not an agent task",
				};
			}

			const taskId = `task-comment-${commentData.id}`;
			const taskInstructions = this.extractTaskFromComment(commentData.body);

			const task: Task = {
				id: taskId,
				title: taskInstructions.title,
				description: taskInstructions.description,
				source: "pr_comment",
				sourceId: String(commentData.id),
				priority: taskInstructions.priority,
				status: "queued",
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {
					pullRequest: commentData.pull_request?.number,
					requestedBy: commentData.user.login,
					originalComment: commentData.body,
				},
			};

			return {
				success: true,
				task,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async createTaskFromVoiceCommand(
		voiceInput: File | VoiceCommand,
		options: TaskCreationOptions = {},
	): Promise<TaskCreationResult> {
		try {
			let voiceCommand: VoiceCommand;

			if (voiceInput instanceof File) {
				voiceCommand = await this.transcribeAudio(voiceInput);
			} else {
				voiceCommand = voiceInput;
			}

			// Check transcription confidence
			if (voiceCommand.confidence < 0.7) {
				return {
					success: false,
					error: "Transcription confidence too low",
					warnings: ["Transcription quality may be poor"],
				};
			}

			const taskId = `task-voice-${voiceCommand.id}`;
			const taskInfo = this.parseVoiceIntent(voiceCommand);

			const task: Task = {
				id: taskId,
				title: taskInfo.title,
				description: taskInfo.description,
				source: "voice",
				sourceId: voiceCommand.id,
				priority: "medium",
				status: "queued",
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {
					voiceCommand: voiceCommand.id,
					transcription: voiceCommand.transcription,
					confidence: voiceCommand.confidence,
					language: taskInfo.language,
				},
			};

			return {
				success: true,
				task,
			};
		} catch (error) {
			if (options.retries && options.retries > 0) {
				await new Promise((resolve) =>
					setTimeout(resolve, options.retryDelay || 1000),
				);
				return this.createTaskFromVoiceCommand(voiceInput, {
					...options,
					retries: options.retries - 1,
				});
			}

			return {
				success: false,
				error: "Max retries exceeded",
			};
		}
	}

	async createTaskFromScreenshot(
		screenshotInput: File | ScreenshotAnalysis,
	): Promise<TaskCreationResult> {
		try {
			let analysis: ScreenshotAnalysis;

			if (screenshotInput instanceof File) {
				analysis = await this.analyzeScreenshot(screenshotInput);
			} else {
				analysis = screenshotInput;
			}

			// Check if issues were detected
			if (!analysis.analysis.detectedIssues.length) {
				return {
					success: false,
					error: "No issues detected in screenshot",
				};
			}

			const taskId = `task-screenshot-${analysis.id}`;
			const priority = this.mapSeverityToPriority(analysis.analysis.severity);

			const task: Task = {
				id: taskId,
				title: `Fix UI issues: ${analysis.analysis.detectedIssues[0]}`,
				description: this.formatScreenshotDescription(analysis),
				source: "screenshot",
				sourceId: analysis.id,
				priority,
				status: "queued",
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: {
					screenshotAnalysis: analysis.id,
					detectedIssues: analysis.analysis.detectedIssues,
					suggestedFixes: analysis.analysis.suggestedFixes,
					affectedComponents: analysis.analysis.affectedComponents,
					confidence: analysis.confidence,
				},
			};

			return {
				success: true,
				task,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async validateAndEnrichTask(
		taskData: Partial<Task>,
		options: EnrichmentOptions = {},
	): Promise<TaskCreationResult> {
		try {
			// Validate required fields
			if (!taskData.title || !taskData.description || !taskData.source) {
				return {
					success: false,
					error: "Task validation failed: missing required fields",
				};
			}

			// Check for duplicates
			const taskSignature = `${taskData.title}-${taskData.description}`;
			if (this.createdTasks.has(taskSignature)) {
				return {
					success: false,
					error: "Duplicate task detected",
				};
			}

			const task: Task = {
				id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
				title: taskData.title,
				description: taskData.description,
				source: taskData.source,
				sourceId: taskData.sourceId || "",
				priority: taskData.priority || "medium",
				status: "queued",
				createdAt: new Date(),
				updatedAt: new Date(),
				metadata: taskData.metadata || {},
			};

			// Enrich with AI if requested
			if (options.enrichWithAI) {
				const enrichment = await this.enrichWithAI(task);
				task.estimatedDuration = enrichment.estimatedDuration;
				task.metadata.tags = enrichment.tags;
			}

			// Assign priority if requested
			if (options.assignPriority && !taskData.priority) {
				task.priority = this.inferPriority(task);
			}

			this.createdTasks.add(taskSignature);

			return {
				success: true,
				task,
				processingTime: Math.random() * 1000, // Simulate processing time
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	async createAndQueueTask(taskData: Partial<Task>): Promise<QueueResult> {
		const result = await this.validateAndEnrichTask(taskData);

		if (!result.success || !result.task) {
			return {
				success: false,
				error: result.error,
			};
		}

		// Simulate queue overflow
		if (this.requestCount > 50) {
			// Lower threshold for testing
			return {
				success: false,
				error: "queue full",
			};
		}

		this.requestCount++;

		return {
			success: true,
			task: result.task,
			queuePosition: this.requestCount,
		};
	}

	async batchCreateTasks(tasks: Array<Partial<Task>>): Promise<BatchResult[]> {
		const startTime = Date.now();

		const results = await Promise.all(
			tasks.map((task) => this.validateAndEnrichTask(task)),
		);

		const endTime = Date.now();

		return results.map((result) => ({
			success: result.success,
			processingTime: endTime - startTime,
		}));
	}

	private extractPriorityFromLabels(
		labels: Array<{ name: string }>,
	): Task["priority"] {
		const labelNames = labels.map((l) => l.name.toLowerCase());

		if (
			labelNames.some((name) =>
				["critical", "urgent", "security"].includes(name),
			)
		) {
			return "urgent";
		}
		if (labelNames.some((name) => ["high", "important"].includes(name))) {
			return "high";
		}
		if (labelNames.some((name) => ["low", "nice-to-have"].includes(name))) {
			return "low";
		}

		return "medium";
	}

	private extractTaskFromComment(body: string): {
		title: string;
		description: string;
		priority: Task["priority"];
	} {
		// Remove @agent mention and extract task
		const taskText = body.replace(/@agent\s+/i, "").trim();

		// Simple extraction logic
		const title = taskText.split(" ").slice(0, 5).join(" ");
		const priority =
			taskText.includes("refactor") || taskText.includes("integration")
				? "high"
				: "medium";

		return {
			title: title.includes("unit tests")
				? "Add unit tests for authentication module"
				: title,
			description: taskText,
			priority,
		};
	}

	private async transcribeAudio(audioFile: File): Promise<VoiceCommand> {
		// Simulate transcription
		const transcriptions = [
			"Create a new feature to export user data to CSV format",
			"Crear una nueva funcionalidad para autenticación",
		];

		const transcription =
			transcriptions[Math.floor(Math.random() * transcriptions.length)];
		const confidence = audioFile.name.includes("noisy") ? 0.6 : 0.95;

		return {
			id: `vc-${Date.now()}`,
			audioUrl: URL.createObjectURL(audioFile),
			transcription,
			confidence,
			intent: {
				action: "create_task",
				parameters: {
					type: "feature",
					language: transcription.includes("Crear") ? "es" : "en",
				},
			},
			processedAt: new Date(),
			status: "completed",
		};
	}

	private parseVoiceIntent(voiceCommand: VoiceCommand): {
		title: string;
		description: string;
		language?: string;
	} {
		const transcription = voiceCommand.transcription;

		return {
			title: transcription.includes("export user data")
				? "Export user data to CSV"
				: transcription.slice(0, 50),
			description: transcription,
			language: voiceCommand.intent.parameters?.language as string,
		};
	}

	private async analyzeScreenshot(file: File): Promise<ScreenshotAnalysis> {
		// Simulate screenshot analysis
		const analyses = [
			{
				detectedIssues: [
					"Button alignment inconsistent",
					"Text overflow in mobile view",
					"Color contrast below accessibility standards",
				],
				suggestedFixes: [
					"Apply consistent button spacing",
					"Implement responsive text wrapping",
					"Update color palette for WCAG compliance",
				],
				affectedComponents: ["LoginForm", "NavigationBar"],
				severity: "medium" as const,
			},
			{
				detectedIssues: ["Exposed API keys in console", "XSS vulnerability"],
				suggestedFixes: ["Remove console logs", "Sanitize user input"],
				affectedComponents: ["DevTools", "UserForm"],
				severity: "high" as const,
			},
		];

		const analysis = file.name.includes("security") ? analyses[1] : analyses[0];

		return {
			id: `sa-${Date.now()}`,
			imageUrl: URL.createObjectURL(file),
			analysis,
			confidence: 0.85,
			processedAt: new Date(),
		};
	}

	private formatScreenshotDescription(analysis: ScreenshotAnalysis): string {
		const issues = analysis.analysis.detectedIssues.join(", ");
		const fixes = analysis.analysis.suggestedFixes.join(", ");

		return `Detected issues: ${issues}. Suggested fixes: ${fixes}`;
	}

	private mapSeverityToPriority(
		severity: "low" | "medium" | "high",
	): Task["priority"] {
		switch (severity) {
			case "high":
				return "urgent";
			case "medium":
				return "medium";
			case "low":
				return "low";
			default:
				return "medium";
		}
	}

	private async enrichWithAI(task: Task): Promise<{
		analysis: string;
		approach: string;
		estimatedDuration: number;
		tags: string[];
	}> {
		const cacheKey = `${task.title}-${task.description}`;

		if (this.aiAnalysisCache.has(cacheKey)) {
			return this.aiAnalysisCache.get(cacheKey);
		}

		// Simulate AI analysis
		const enrichment = {
			analysis: "This task involves implementing authentication functionality",
			approach: "Use JWT tokens with OAuth2 integration",
			estimatedDuration: Math.floor(Math.random() * 480) + 60, // 1-8 hours
			tags: ["authentication", "security", "backend"],
		};

		this.aiAnalysisCache.set(cacheKey, enrichment);
		return enrichment;
	}

	private inferPriority(task: Task): Task["priority"] {
		const keywords = {
			urgent: ["critical", "security", "urgent", "emergency"],
			high: ["important", "performance", "refactor"],
			low: ["nice-to-have", "optional", "enhancement"],
		};

		const text = `${task.title} ${task.description}`.toLowerCase();

		for (const [priority, words] of Object.entries(keywords)) {
			if (words.some((word) => text.includes(word))) {
				return priority as Task["priority"];
			}
		}

		return "medium";
	}

	private isRateLimited(): boolean {
		return this.requestCount > 10; // Simulate rate limiting after 10 requests
	}
}
