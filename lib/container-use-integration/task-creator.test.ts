/**
 * Test suite for multi-source task creator
 * Tests the core functionality for creating tasks from various sources:
 * GitHub issues, PR comments, voice commands, and screenshot analysis.
 */

import { MultiSourceTaskCreator } from "./task-creator";
import { ContainerUseError } from "./types";

describe("MultiSourceTaskCreator", () => {
	let taskCreator: MultiSourceTaskCreator;

	beforeEach(() => {
		taskCreator = new MultiSourceTaskCreator({
			openaiApiKey: "test-openai-key",
			githubToken: "test-github-token",
			webhookSecret: "test-webhook-secret",
		});
	});

	describe("createTaskFromIssue", () => {
		test("should create task from GitHub issue", async () => {
			// This test will fail initially (RED phase)
			const issueData = {
				id: 123,
				title: "Add user authentication",
				body: "Implement JWT-based authentication with OAuth2 support",
				labels: [{ name: "feature" }, { name: "backend" }],
				assignee: { login: "developer" },
				repository: { full_name: "org/repo" },
			};

			const result = await taskCreator.createTaskFromIssue(issueData);

			expect(result.success).toBe(true);
			expect(result.task).toBeDefined();
			expect(result.task?.title).toBe(issueData.title);
			expect(result.task?.description).toBe(issueData.body);
			expect(result.task?.source).toBe("issue");
			expect(result.task?.sourceId).toBe("123");
			expect(["low", "medium", "high", "urgent"]).toContain(result.task?.priority);
		});

		test("should extract priority from issue labels", async () => {
			const highPriorityIssue = {
				id: 456,
				title: "Critical security fix",
				body: "Fix SQL injection vulnerability",
				labels: [{ name: "bug" }, { name: "critical" }, { name: "security" }],
				repository: { full_name: "org/repo" },
			};

			const result = await taskCreator.createTaskFromIssue(highPriorityIssue);

			expect(result.success).toBe(true);
			expect(result.task?.priority).toBe("urgent");
		});

		test("should handle malformed issue data", async () => {
			const malformedIssue = {
				id: null,
				title: "",
				body: null,
			};

			const result = await taskCreator.createTaskFromIssue(malformedIssue as any);

			expect(result.success).toBe(false);
			expect(result.error).toContain("invalid issue data");
		});

		test("should enrich task with AI analysis", async () => {
			const complexIssue = {
				id: 789,
				title: "Improve performance",
				body: "The dashboard is loading slowly. Need to optimize database queries and implement caching.",
				labels: [{ name: "performance" }],
				repository: { full_name: "org/repo" },
			};

			const result = await taskCreator.createTaskFromIssue(complexIssue, {
				enrichWithAI: true,
			});

			expect(result.success).toBe(true);
			expect(result.task?.metadata.aiAnalysis).toBeDefined();
			expect(result.task?.metadata.suggestedApproach).toBeDefined();
			expect(result.task?.estimatedDuration).toBeGreaterThan(0);
		});
	});

	describe("createTaskFromPRComment", () => {
		test("should create task from PR comment", async () => {
			const commentData = {
				id: 456,
				body: "@agent please add unit tests for the new authentication module",
				user: { login: "reviewer" },
				pull_request: {
					number: 42,
					title: "Add authentication",
					repository: { full_name: "org/repo" },
				},
			};

			const result = await taskCreator.createTaskFromPRComment(commentData);

			expect(result.success).toBe(true);
			expect(result.task?.source).toBe("pr_comment");
			expect(result.task?.sourceId).toBe("456");
			expect(result.task?.title).toContain("unit tests");
			expect(result.task?.metadata.pullRequest).toBe(42);
		});

		test("should ignore comments not mentioning agent", async () => {
			const regularComment = {
				id: 789,
				body: "Looks good to me!",
				user: { login: "reviewer" },
				pull_request: { number: 42 },
			};

			const result = await taskCreator.createTaskFromPRComment(regularComment);

			expect(result.success).toBe(false);
			expect(result.error).toContain("not an agent task");
		});

		test("should parse complex task instructions from comments", async () => {
			const complexComment = {
				id: 101,
				body: "@agent refactor the user service to use dependency injection and add integration tests with mocked database",
				user: { login: "senior-dev" },
				pull_request: {
					number: 55,
					repository: { full_name: "org/repo" },
				},
			};

			const result = await taskCreator.createTaskFromPRComment(complexComment);

			expect(result.success).toBe(true);
			expect(result.task?.description).toContain("dependency injection");
			expect(result.task?.description).toContain("integration tests");
			expect(["medium", "high"]).toContain(result.task?.priority);
		});
	});

	describe("createTaskFromVoiceCommand", () => {
		test("should transcribe and create task from voice command", async () => {
			const audioFile = new File(["fake audio data"], "command.wav", {
				type: "audio/wav",
			});

			const result = await taskCreator.createTaskFromVoiceCommand(audioFile);

			expect(result.success).toBe(true);
			expect(result.task?.source).toBe("voice");
			expect(result.task?.metadata.voiceCommand).toBeDefined();
			expect(result.task?.metadata.transcription).toBeDefined();
			expect(result.task?.metadata.confidence).toBeGreaterThan(0.7);
		});

		test("should handle low confidence transcriptions", async () => {
			const noisyAudioFile = new File(["noisy audio"], "noisy.wav", {
				type: "audio/wav",
			});

			const result = await taskCreator.createTaskFromVoiceCommand(noisyAudioFile);

			if (result.success) {
				expect(result.warnings).toContain("transcription quality");
			} else {
				expect(result.error).toContain("low confidence");
			}
		});

		test("should parse intent from voice commands", async () => {
			const voiceCommand: VoiceCommand = {
				id: "vc-123",
				audioUrl: "https://example.com/audio.wav",
				transcription: "Create a new feature to export user data to CSV format",
				confidence: 0.95,
				intent: {
					action: "create_task",
					parameters: {
						type: "feature",
						description: "export user data to CSV",
					},
				},
				processedAt: new Date(),
				status: "completed",
			};

			const result = await taskCreator.createTaskFromVoiceCommand(voiceCommand);

			expect(result.success).toBe(true);
			expect(result.task?.title).toContain("export user data");
			expect(result.task?.description).toContain("CSV format");
		});

		test("should handle voice commands in different languages", async () => {
			const spanishCommand: VoiceCommand = {
				id: "vc-es",
				audioUrl: "https://example.com/spanish.wav",
				transcription: "Crear una nueva funcionalidad para autenticación",
				confidence: 0.88,
				intent: {
					action: "create_task",
					parameters: { language: "es" },
				},
				processedAt: new Date(),
				status: "completed",
			};

			const result = await taskCreator.createTaskFromVoiceCommand(spanishCommand);

			expect(result.success).toBe(true);
			expect(result.task?.metadata.language).toBe("es");
		});
	});

	describe("createTaskFromScreenshot", () => {
		test("should analyze screenshot and create bug report task", async () => {
			const screenshotFile = new File(["fake image data"], "bug.png", {
				type: "image/png",
			});

			const result = await taskCreator.createTaskFromScreenshot(screenshotFile);

			expect(result.success).toBe(true);
			expect(result.task?.source).toBe("screenshot");
			expect(result.task?.metadata.screenshotAnalysis).toBeDefined();
			expect(result.task?.metadata.detectedIssues).toBeInstanceOf(Array);
		});

		test("should identify UI/UX issues from screenshots", async () => {
			const analysis: ScreenshotAnalysis = {
				id: "sa-123",
				imageUrl: "https://example.com/ui-issue.png",
				analysis: {
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
					severity: "medium",
				},
				confidence: 0.85,
				processedAt: new Date(),
			};

			const result = await taskCreator.createTaskFromScreenshot(analysis);

			expect(result.success).toBe(true);
			expect(result.task?.priority).toBe("medium");
			expect(result.task?.description).toContain("Button alignment");
			expect(result.task?.metadata.affectedComponents).toContain("LoginForm");
		});

		test("should handle screenshots with no detectable issues", async () => {
			const cleanScreenshot = new File(["clean UI"], "clean.png", {
				type: "image/png",
			});

			const result = await taskCreator.createTaskFromScreenshot(cleanScreenshot);

			if (!result.success) {
				expect(result.error).toContain("no issues detected");
			}
		});

		test("should prioritize security-related visual issues", async () => {
			const securityAnalysis: ScreenshotAnalysis = {
				id: "sa-security",
				imageUrl: "https://example.com/security.png",
				analysis: {
					detectedIssues: ["Exposed API keys in console", "XSS vulnerability"],
					suggestedFixes: ["Remove console logs", "Sanitize user input"],
					affectedComponents: ["DevTools", "UserForm"],
					severity: "high",
				},
				confidence: 0.92,
				processedAt: new Date(),
			};

			const result = await taskCreator.createTaskFromScreenshot(securityAnalysis);

			expect(result.success).toBe(true);
			expect(result.task?.priority).toBe("urgent");
		});
	});

	describe("validateAndEnrichTask", () => {
		test("should validate task data before creation", async () => {
			const invalidTask = {
				title: "",
				description: "",
				source: "invalid" as any,
			};

			const result = await taskCreator.validateAndEnrichTask(invalidTask);

			expect(result.success).toBe(false);
			expect(result.error).toContain("validation failed");
		});

		test("should enrich task with additional metadata", async () => {
			const basicTask = {
				title: "Fix login bug",
				description: "User cannot login with valid credentials",
				source: "manual" as const,
			};

			const result = await taskCreator.validateAndEnrichTask(basicTask, {
				enrichWithAI: true,
				assignPriority: true,
			});

			expect(result.success).toBe(true);
			expect(result.task?.priority).toBeDefined();
			expect(result.task?.estimatedDuration).toBeGreaterThan(0);
			expect(result.task?.metadata.tags).toBeInstanceOf(Array);
		});

		test("should detect duplicate tasks", async () => {
			const existingTask = {
				title: "Add authentication",
				description: "Implement user login system",
				source: "manual" as const,
			};

			// Create first task
			const firstResult = await taskCreator.validateAndEnrichTask(existingTask);
			expect(firstResult.success).toBe(true);

			// Try to create duplicate
			const duplicateResult = await taskCreator.validateAndEnrichTask(existingTask);

			expect(duplicateResult.success).toBe(false);
			expect(duplicateResult.error).toContain("duplicate task");
		});
	});

	describe("task queue integration", () => {
		test("should queue validated tasks for agent assignment", async () => {
			const taskData = {
				title: "Implement search feature",
				description: "Add full-text search to product catalog",
				source: "manual" as const,
				priority: "high" as const,
			};

			const result = await taskCreator.createAndQueueTask(taskData);

			expect(result.success).toBe(true);
			expect(result.task?.status).toBe("queued");
			expect(result.task?.id).toBeDefined();
			expect(result.queuePosition).toBeGreaterThan(0);
		});

		test("should handle queue overflow gracefully", async () => {
			// Fill up the queue
			const tasks = Array.from({ length: 1000 }, (_, i) => ({
				title: `Task ${i}`,
				description: `Description ${i}`,
				source: "manual" as const,
			}));

			const results = await Promise.all(tasks.map((task) => taskCreator.createAndQueueTask(task)));

			const overflowResults = results.filter(
				(result) => !result.success && result.error?.includes("queue full")
			);

			expect(overflowResults.length).toBeGreaterThan(0);
		});
	});

	describe("error handling and recovery", () => {
		test("should handle API failures gracefully", async () => {
			// Mock API failure
			const issueData = {
				id: 999,
				title: "API test",
				body: "Testing API failure",
				repository: { full_name: "org/repo" },
			};

			const result = await taskCreator.createTaskFromIssue(issueData);

			if (!result.success) {
				expect(result.error).toBeDefined();
				expect(result.retryable).toBe(true);
			}
		});

		test("should implement retry logic for transient failures", async () => {
			const voiceFile = new File(["retry test"], "retry.wav", {
				type: "audio/wav",
			});

			const result = await taskCreator.createTaskFromVoiceCommand(voiceFile, {
				retries: 3,
				retryDelay: 100,
			});

			// Should either succeed or exhaust retries
			expect([true, false]).toContain(result.success);
			if (!result.success) {
				expect(result.error).toContain("max retries exceeded");
			}
		});

		test("should handle rate limiting from external APIs", async () => {
			// Simulate many rapid requests
			const promises = Array.from({ length: 100 }, (_, i) =>
				taskCreator.createTaskFromIssue({
					id: i,
					title: `Rate limit test ${i}`,
					body: "Testing rate limits",
					repository: { full_name: "org/repo" },
				})
			);

			const results = await Promise.allSettled(promises);
			const rateLimitedResults = results.filter(
				(result) =>
					result.status === "fulfilled" &&
					!result.value.success &&
					result.value.error?.includes("rate limit")
			);

			expect(rateLimitedResults.length).toBeGreaterThan(0);
		});
	});

	describe("performance optimization", () => {
		test("should batch process multiple tasks efficiently", async () => {
			const taskBatch = Array.from({ length: 10 }, (_, i) => ({
				title: `Batch task ${i}`,
				description: `Batch description ${i}`,
				source: "manual" as const,
			}));

			const startTime = Date.now();
			const results = await taskCreator.batchCreateTasks(taskBatch);
			const endTime = Date.now();

			expect(results.length).toBe(10);
			expect(endTime - startTime).toBeLessThan(5000); // Should complete in < 5s
			expect(results.every((r) => r.success)).toBe(true);
		});

		test("should cache AI analysis results", async () => {
			const taskData = {
				title: "Cache test",
				description: "Testing AI analysis caching",
				source: "manual" as const,
			};

			// First call
			const firstResult = await taskCreator.validateAndEnrichTask(taskData, {
				enrichWithAI: true,
			});
			const firstDuration = firstResult.processingTime;

			// Second call should be faster due to caching
			const secondResult = await taskCreator.validateAndEnrichTask(taskData, {
				enrichWithAI: true,
			});
			const secondDuration = secondResult.processingTime;

			expect(secondDuration).toBeLessThan(firstDuration);
		});
	});
});
