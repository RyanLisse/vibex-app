import { afterEach, beforeEach, describe, expect, it, spyOn, test } from "vitest";
import { z } from "zod";
import {
	ApiErrorResponseSchema,
	ApiSuccessResponseSchema,
	CreateEnvironmentSchema,
	CreateTaskSchema,
	createApiErrorResponse,
	createApiSuccessResponse,
	createPaginatedResponse,
	EnvironmentSchema,
	FileUploadRequestSchema,
	FileUploadResponseSchema,
	GitHubBranchesRequestSchema,
	GitHubBranchSchema,
	GitHubOAuthCallbackSchema,
	GitHubOAuthUrlSchema,
	GitHubRepositoriesRequestSchema,
	GitHubRepositorySchema,
	GitHubUserSchema,
	InngestEventSchema,
	InngestFunctionSchema,
	PaginatedResponseSchema,
	TaskSchema,
	TasksRequestSchema,
	UpdateTaskSchema,
	ValidationErrorSchema,
	validateApiRequest,
	WebhookPayloadSchema,
	WebhookResponseSchema,
} from "./api-routes";

describe("API Routes Schemas", () => {
	describe("GitHub OAuth Schemas", () => {
		describe("GitHubOAuthCallbackSchema", () => {
			it("should validate OAuth callback with code", () => {
				const validCallback = {
					code: "auth_code_123",
					state: "random_state",
				};

				expect(() => GitHubOAuthCallbackSchema.parse(validCallback)).not.toThrow();
			});

			it("should validate OAuth callback with error", () => {
				const errorCallback = {
					code: "",
					error: "access_denied",
					error_description: "User denied access",
				};

				expect(() => GitHubOAuthCallbackSchema.parse(errorCallback)).toThrow(/required/);
			});

			it("should require code to be non-empty", () => {
				const invalidCallback = { code: "" };
				expect(() => GitHubOAuthCallbackSchema.parse(invalidCallback)).toThrow(/required/);
			});

			it("should make state and error fields optional", () => {
				const minimalCallback = { code: "auth_code_123" };
				expect(() => GitHubOAuthCallbackSchema.parse(minimalCallback)).not.toThrow();
			});
		});

		describe("GitHubOAuthUrlSchema", () => {
			it("should validate OAuth URL parameters", () => {
				const validUrl = {
					redirect_uri: "https://example.com/callback",
					scope: "user:email,repo",
					state: "random_state",
				};

				expect(() => GitHubOAuthUrlSchema.parse(validUrl)).not.toThrow();
			});

			it("should apply default scope", () => {
				const minimalUrl = { redirect_uri: "https://example.com/callback" };
				const result = GitHubOAuthUrlSchema.parse(minimalUrl);
				expect(result.scope).toBe("user:email,public_repo");
			});

			it("should validate redirect URI format", () => {
				const invalidUrl = { redirect_uri: "not-a-valid-url" };
				expect(() => GitHubOAuthUrlSchema.parse(invalidUrl)).toThrow(/Invalid redirect URI/);
			});
		});

		describe("GitHubUserSchema", () => {
			it("should validate GitHub user data", () => {
				const validUser = {
					id: 12_345,
					login: "testuser",
					avatar_url: "https://github.com/avatar.jpg",
					name: "Test User",
					email: "test@example.com",
					bio: "Software developer",
					location: "San Francisco",
					company: "Test Company",
					html_url: "https://github.com/testuser",
					followers: 100,
					following: 50,
					public_repos: 25,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
				};

				expect(() => GitHubUserSchema.parse(validUser)).not.toThrow();
			});

			it("should handle nullable fields", () => {
				const userWithNulls = {
					id: 12_345,
					login: "testuser",
					avatar_url: "https://github.com/avatar.jpg",
					name: null,
					email: null,
					bio: null,
					location: null,
					company: null,
					html_url: "https://github.com/testuser",
					followers: 100,
					following: 50,
					public_repos: 25,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
				};

				expect(() => GitHubUserSchema.parse(userWithNulls)).not.toThrow();
			});

			it("should validate URL formats", () => {
				const invalidUser = {
					id: 12_345,
					login: "testuser",
					avatar_url: "not-a-url",
					html_url: "https://github.com/testuser",
					followers: 100,
					following: 50,
					public_repos: 25,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
				};

				expect(() => GitHubUserSchema.parse(invalidUser)).toThrow();
			});
		});

		describe("GitHubRepositorySchema", () => {
			it("should validate GitHub repository data", () => {
				const validRepo = {
					id: 12_345,
					name: "test-repo",
					full_name: "testuser/test-repo",
					description: "A test repository",
					html_url: "https://github.com/testuser/test-repo",
					clone_url: "https://github.com/testuser/test-repo.git",
					ssh_url: "git@github.com:testuser/test-repo.git",
					default_branch: "main",
					private: false,
					fork: false,
					archived: false,
					disabled: false,
					language: "JavaScript",
					stargazers_count: 100,
					watchers_count: 50,
					forks_count: 25,
					open_issues_count: 5,
					size: 1024,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					pushed_at: "2023-01-01T00:00:00Z",
					owner: {
						id: 12_345,
						login: "testuser",
						avatar_url: "https://github.com/avatar.jpg",
						name: "Test User",
						email: "test@example.com",
						bio: "Software developer",
						location: "San Francisco",
						company: "Test Company",
						html_url: "https://github.com/testuser",
						followers: 100,
						following: 50,
						public_repos: 25,
						created_at: "2020-01-01T00:00:00Z",
						updated_at: "2023-01-01T00:00:00Z",
					},
				};

				expect(() => GitHubRepositorySchema.parse(validRepo)).not.toThrow();
			});

			it("should handle optional permissions", () => {
				const repoWithPermissions = {
					id: 12_345,
					name: "test-repo",
					full_name: "testuser/test-repo",
					description: "A test repository",
					html_url: "https://github.com/testuser/test-repo",
					clone_url: "https://github.com/testuser/test-repo.git",
					ssh_url: "git@github.com:testuser/test-repo.git",
					default_branch: "main",
					private: false,
					fork: false,
					archived: false,
					disabled: false,
					language: "JavaScript",
					stargazers_count: 100,
					watchers_count: 50,
					forks_count: 25,
					open_issues_count: 5,
					size: 1024,
					created_at: "2020-01-01T00:00:00Z",
					updated_at: "2023-01-01T00:00:00Z",
					pushed_at: "2023-01-01T00:00:00Z",
					owner: {
						id: 12_345,
						login: "testuser",
						avatar_url: "https://github.com/avatar.jpg",
						name: "Test User",
						email: "test@example.com",
						bio: "Software developer",
						location: "San Francisco",
						company: "Test Company",
						html_url: "https://github.com/testuser",
						followers: 100,
						following: 50,
						public_repos: 25,
						created_at: "2020-01-01T00:00:00Z",
						updated_at: "2023-01-01T00:00:00Z",
					},
					permissions: {
						admin: true,
						push: true,
						pull: true,
					},
				};

				expect(() => GitHubRepositorySchema.parse(repoWithPermissions)).not.toThrow();
			});
		});

		describe("GitHubBranchSchema", () => {
			it("should validate GitHub branch data", () => {
				const validBranch = {
					name: "main",
					commit: {
						sha: "abc123def456",
						url: "https://api.github.com/repos/user/repo/commits/abc123def456",
					},
					protected: false,
				};

				expect(() => GitHubBranchSchema.parse(validBranch)).not.toThrow();
			});

			it("should validate commit URL format", () => {
				const invalidBranch = {
					name: "main",
					commit: {
						sha: "abc123def456",
						url: "not-a-url",
					},
					protected: false,
				};

				expect(() => GitHubBranchSchema.parse(invalidBranch)).toThrow();
			});
		});

		describe("Request schemas", () => {
			describe("GitHubRepositoriesRequestSchema", () => {
				it("should validate repositories request", () => {
					const validRequest = {
						type: "owner" as const,
						sort: "created" as const,
						direction: "asc" as const,
						per_page: 50,
						page: 2,
					};

					expect(() => GitHubRepositoriesRequestSchema.parse(validRequest)).not.toThrow();
				});

				it("should apply default values", () => {
					const result = GitHubRepositoriesRequestSchema.parse({});
					expect(result.visibility).toBe("all");
					expect(result.affiliation).toBe("owner");
					expect(result.sort).toBe("updated");
					expect(result.direction).toBe("desc");
					expect(result.per_page).toBe(30);
					expect(result.page).toBe(1);
				});

				it("should enforce per_page limits", () => {
					expect(() => GitHubRepositoriesRequestSchema.parse({ per_page: 0 })).toThrow();
					expect(() => GitHubRepositoriesRequestSchema.parse({ per_page: 101 })).toThrow();
				});
			});

			describe("GitHubBranchesRequestSchema", () => {
				it("should validate branches request", () => {
					const validRequest = {
						owner: "testuser",
						repo: "test-repo",
						per_page: 50,
						page: 2,
					};

					expect(() => GitHubBranchesRequestSchema.parse(validRequest)).not.toThrow();
				});

				it("should require owner and repo", () => {
					expect(() => GitHubBranchesRequestSchema.parse({ owner: "test" })).toThrow(
						/expected string, received undefined/
					);
					expect(() => GitHubBranchesRequestSchema.parse({ repo: "test" })).toThrow(
						/expected string, received undefined/
					);
				});

				it("should enforce non-empty owner and repo", () => {
					expect(() => GitHubBranchesRequestSchema.parse({ owner: "", repo: "test" })).toThrow();
					expect(() => GitHubBranchesRequestSchema.parse({ owner: "test", repo: "" })).toThrow();
				});
			});
		});
	});

	describe("Task Management Schemas", () => {
		describe("TaskSchema", () => {
			it("should validate complete task", () => {
				const validTask = {
					id: "123e4567-e89b-12d3-a456-426614174000",
					title: "Test Task",
					description: "A test task description",
					status: "in_progress" as const,
					priority: "high" as const,
					tags: ["urgent", "bug"],
					assignee: "user123",
					due_date: new Date("2023-12-31T23:59:59Z"),
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z"),
				};

				expect(() => TaskSchema.parse(validTask)).not.toThrow();
			});

			it("should apply default values", () => {
				const minimalTask = {
					id: "123e4567-e89b-12d3-a456-426614174000",
					title: "Test Task",
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z"),
				};

				const result = TaskSchema.parse(minimalTask);
				expect(result.status).toBe("todo");
				expect(result.priority).toBe("medium");
				expect(result.tags).toEqual([]);
			});

			it("should enforce title constraints", () => {
				const baseTask = {
					id: "123e4567-e89b-12d3-a456-426614174000",
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z"),
				};

				expect(() => TaskSchema.parse({ ...baseTask, title: "" })).toThrow(/required/);
				expect(() => TaskSchema.parse({ ...baseTask, title: "a".repeat(201) })).toThrow(
					/less than 200/
				);
			});

			it("should validate enum values", () => {
				const baseTask = {
					id: "123e4567-e89b-12d3-a456-426614174000",
					title: "Test Task",
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z"),
				};

				const validStatuses = ["todo", "in_progress", "done"];
				validStatuses.forEach((status) => {
					expect(() => TaskSchema.parse({ ...baseTask, status })).not.toThrow();
				});

				const validPriorities = ["low", "medium", "high", "urgent"];
				validPriorities.forEach((priority) => {
					expect(() => TaskSchema.parse({ ...baseTask, priority })).not.toThrow();
				});
			});
		});

		describe("CreateTaskSchema", () => {
			it("should validate task creation", () => {
				const validCreateTask = {
					title: "New Task",
					description: "Task description",
					priority: "high" as const,
					tags: ["feature"],
					assignee: "user123",
					due_date: new Date("2023-12-31T23:59:59Z"),
				};

				expect(() => CreateTaskSchema.parse(validCreateTask)).not.toThrow();
			});

			it("should require only title", () => {
				const minimalTask = { title: "New Task" };
				const result = CreateTaskSchema.parse(minimalTask);
				expect(result.priority).toBe("medium");
				expect(result.tags).toEqual([]);
			});
		});

		describe("UpdateTaskSchema", () => {
			it("should validate task updates", () => {
				const validUpdate = {
					title: "Updated Task",
					status: "done" as const,
					priority: "low" as const,
				};

				expect(() => UpdateTaskSchema.parse(validUpdate)).not.toThrow();
			});

			it("should allow partial updates", () => {
				const partialUpdate = { status: "in_progress" as const };
				expect(() => UpdateTaskSchema.parse(partialUpdate)).not.toThrow();
			});

			it("should allow empty updates", () => {
				expect(() => UpdateTaskSchema.parse({})).not.toThrow();
			});
		});

		describe("TasksRequestSchema", () => {
			it("should validate tasks request", () => {
				const validRequest = {
					status: "todo" as const,
					priority: "high" as const,
					assignee: "user123",
					tags: ["urgent"],
					page: 1,
					per_page: 20,
				};

				expect(() => TasksRequestSchema.parse(validRequest)).not.toThrow();
			});

			it("should make all filters optional", () => {
				expect(() => TasksRequestSchema.parse({})).not.toThrow();
			});
		});
	});

	describe("Environment Management Schemas", () => {
		describe("EnvironmentSchema", () => {
			it("should validate complete environment", () => {
				const validEnvironment = {
					id: "123e4567-e89b-12d3-a456-426614174000",
					name: "Production",
					description: "Production environment",
					type: "production" as const,
					url: "https://api.production.com",
					status: "active" as const,
					variables: { API_KEY: "prod-key" },
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z"),
				};

				expect(() => EnvironmentSchema.parse(validEnvironment)).not.toThrow();
			});

			it("should apply default values", () => {
				const minimalEnvironment = {
					id: "123e4567-e89b-12d3-a456-426614174000",
					name: "Test Environment",
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z"),
				};

				const result = EnvironmentSchema.parse(minimalEnvironment);
				expect(result.type).toBe("development");
				expect(result.status).toBe("active");
				expect(result.variables).toEqual({});
			});

			it("should validate environment types", () => {
				const baseEnv = {
					id: "123e4567-e89b-12d3-a456-426614174000",
					name: "Test Environment",
					created_at: new Date("2023-01-01T00:00:00Z"),
					updated_at: new Date("2023-01-01T00:00:00Z"),
				};

				const validTypes = ["development", "staging", "production", "testing"];
				validTypes.forEach((type) => {
					expect(() => EnvironmentSchema.parse({ ...baseEnv, type })).not.toThrow();
				});
			});
		});

		describe("CreateEnvironmentSchema", () => {
			it("should validate environment creation", () => {
				const validCreate = {
					name: "New Environment",
					description: "A new environment",
					type: "staging" as const,
					url: "https://api.staging.com",
					variables: { DEBUG: "true" },
				};

				expect(() => CreateEnvironmentSchema.parse(validCreate)).not.toThrow();
			});

			it("should require only name", () => {
				const minimalCreate = { name: "New Environment" };
				const result = CreateEnvironmentSchema.parse(minimalCreate);
				expect(result.type).toBe("development");
				expect(result.variables).toEqual({});
			});
		});
	});

	describe("Inngest Schemas", () => {
		describe("InngestEventSchema", () => {
			it("should validate Inngest event", () => {
				const validEvent = {
					name: "user.created",
					data: { userId: "123", email: "test@example.com" },
					user: { id: "123", email: "test@example.com" },
					ts: Date.now(),
					v: "1.0",
				};

				expect(() => InngestEventSchema.parse(validEvent)).not.toThrow();
			});

			it("should require event name", () => {
				expect(() => InngestEventSchema.parse({ name: "" })).toThrow(/required/);
			});

			it("should apply default data", () => {
				const minimalEvent = { name: "test.event" };
				const result = InngestEventSchema.parse(minimalEvent);
				expect(result.data).toEqual({});
			});
		});

		describe("InngestFunctionSchema", () => {
			it("should validate Inngest function", () => {
				const validFunction = {
					id: "process-user",
					name: "Process User",
					trigger: {
						event: "user.created",
						expression: "event.data.premium === true",
					},
					config: {
						retries: 5,
						timeout: "60s",
						rateLimit: {
							limit: 10,
							period: "1m",
						},
					},
				};

				expect(() => InngestFunctionSchema.parse(validFunction)).not.toThrow();
			});

			it("should apply default config values", () => {
				const minimalFunction = {
					id: "test-function",
					name: "Test Function",
					trigger: { event: "test.event" },
				};

				const result = InngestFunctionSchema.parse(minimalFunction);
				expect(result.config?.retries).toBe(3);
				expect(result.config?.timeout).toBe("30s");
			});
		});
	});

	describe("Webhook Schemas", () => {
		describe("WebhookPayloadSchema", () => {
			it("should validate webhook payload", () => {
				const validPayload = {
					event: "user.created",
					timestamp: new Date("2023-01-01T00:00:00Z"),
					data: { userId: "123", email: "test@example.com" },
					source: "api",
				};

				expect(() => WebhookPayloadSchema.parse(validPayload)).not.toThrow();
			});

			it("should require event and timestamp", () => {
				expect(() => WebhookPayloadSchema.parse({ event: "" })).toThrow(/Too small/);
				expect(() =>
					WebhookPayloadSchema.parse({
						event: "test.event",
						timestamp: "invalid-date",
					})
				).toThrow();
			});
		});

		describe("WebhookResponseSchema", () => {
			it("should validate webhook response", () => {
				const validResponse = {
					received: true,
					processed: true,
					message: "Webhook processed successfully",
				};

				expect(() => WebhookResponseSchema.parse(validResponse)).not.toThrow();
			});

			it("should validate error response", () => {
				const errorResponse = {
					received: true,
					processed: false,
					error: "Processing failed",
				};

				expect(() => WebhookResponseSchema.parse(errorResponse)).not.toThrow();
			});
		});
	});

	describe("File Upload Schemas", () => {
		describe("FileUploadRequestSchema", () => {
			it("should validate file upload request", () => {
				const validRequest = {
					filename: "test.jpg",
					content_type: "image/jpeg",
					size: 1024,
				};

				expect(() => FileUploadRequestSchema.parse(validRequest)).not.toThrow();
			});

			it("should reject files that are too large", () => {
				const largeRequest = {
					filename: "large.jpg",
					content_type: "image/jpeg",
					size: 11 * 1024 * 1024, // 11MB
				};

				expect(() => FileUploadRequestSchema.parse(largeRequest)).toThrow();
			});

			it("should reject unsupported file types", () => {
				const unsupportedRequest = {
					filename: "test.exe",
					content_type: "application/exe",
					size: 1024,
				};

				expect(() => FileUploadRequestSchema.parse(unsupportedRequest)).toThrow();
			});

			it("should apply default category", () => {
				const validRequest = {
					filename: "test.jpg",
					content_type: "image/jpeg",
					size: 1024,
				};
				const result = FileUploadRequestSchema.parse(validRequest);
				expect(result.filename).toBe("test.jpg");
				expect(result.content_type).toBe("image/jpeg");
				expect(result.size).toBe(1024);
			});
		});

		describe("FileUploadResponseSchema", () => {
			it("should validate file upload response", () => {
				const validResponse = {
					upload_url: "https://cdn.example.com/uploads/test.jpg",
					file_id: "123e4567-e89b-12d3-a456-426614174000",
					expires_at: new Date("2023-01-01T01:00:00Z"),
				};

				expect(() => FileUploadResponseSchema.parse(validResponse)).not.toThrow();
			});

			it("should validate URL format", () => {
				const invalidResponse = {
					upload_url: "not-a-valid-url",
					file_id: "123e4567-e89b-12d3-a456-426614174000",
					expires_at: new Date("2023-01-01T01:00:00Z"),
				};

				expect(() => FileUploadResponseSchema.parse(invalidResponse)).toThrow();
			});
		});
	});

	describe("Error Response Schemas", () => {
		describe("ValidationErrorSchema", () => {
			it("should validate validation error", () => {
				const validError = {
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: "Validation failed",
						details: [
							{
								field: "email",
								code: "invalid_email",
								message: "Invalid email format",
							},
						],
					},
					timestamp: new Date("2023-01-01T00:00:00Z"),
				};

				expect(() => ValidationErrorSchema.parse(validError)).not.toThrow();
			});

			it("should make code optional", () => {
				const errorWithoutCode = {
					success: false,
					error: {
						code: "INVALID_INPUT",
						message: "Invalid input provided",
						details: [
							{
								field: "email",
								code: "required",
								message: "Email is required",
							},
						],
					},
					timestamp: new Date("2023-01-01T00:00:00Z"),
				};

				expect(() => ValidationErrorSchema.parse(errorWithoutCode)).not.toThrow();
			});
		});

		describe("ApiErrorResponseSchema", () => {
			it("should validate API error response", () => {
				const validError = {
					success: false,
					error: {
						code: "HTTP_400",
						message: "Validation failed",
						details: [{ field: "email", message: "Invalid email format" }],
					},
					timestamp: new Date("2023-01-01T00:00:00Z"),
				};

				expect(() => ApiErrorResponseSchema.parse(validError)).not.toThrow();
			});

			it("should require success to be false", () => {
				const invalidError = {
					success: true,
					error: "This should not work",
					message: "Error message",
					statusCode: 400,
					timestamp: "2023-01-01T00:00:00Z",
				};

				expect(() => ApiErrorResponseSchema.parse(invalidError)).toThrow();
			});
		});
	});

	describe("Success Response Schemas", () => {
		describe("ApiSuccessResponseSchema", () => {
			it("should validate API success response", () => {
				const userSchema = z.object({ id: z.string(), name: z.string() });
				const successSchema = ApiSuccessResponseSchema(userSchema);

				const validResponse = {
					success: true,
					data: { id: "123", name: "Test User" },
					message: "User retrieved successfully",
					meta: {
						timestamp: "2023-01-01T00:00:00Z",
						version: "1.0",
						requestId: "123e4567-e89b-12d3-a456-426614174000",
					},
				};

				expect(() => successSchema.parse(validResponse)).not.toThrow();
			});

			it("should require success to be true", () => {
				const userSchema = z.object({ id: z.string(), name: z.string() });
				const successSchema = ApiSuccessResponseSchema(userSchema);

				const invalidResponse = {
					success: false,
					data: { id: "123", name: "Test User" },
				};

				expect(() => successSchema.parse(invalidResponse)).toThrow();
			});
		});

		describe("PaginatedResponseSchema", () => {
			it("should validate paginated response", () => {
				const userSchema = z.object({ id: z.string(), name: z.string() });
				const paginatedSchema = PaginatedResponseSchema(userSchema);

				const validResponse = {
					success: true,
					data: [
						{ id: "1", name: "User 1" },
						{ id: "2", name: "User 2" },
					],
					pagination: {
						page: 1,
						limit: 20,
						total: 100,
						totalPages: 5,
						hasNext: true,
						hasPrev: false,
					},
					message: "Users retrieved successfully",
				};

				expect(() => paginatedSchema.parse(validResponse)).not.toThrow();
			});

			it("should validate pagination constraints", () => {
				const userSchema = z.object({ id: z.string(), name: z.string() });
				const paginatedSchema = PaginatedResponseSchema(userSchema);

				const invalidResponse = {
					success: true,
					data: [],
					pagination: {
						page: 0, // should be positive
						limit: 20,
						total: 100,
						totalPages: 5,
						hasNext: true,
						hasPrev: false,
					},
				};

				expect(() => paginatedSchema.parse(invalidResponse)).toThrow();
			});
		});
	});

	describe("Utility Functions", () => {
		describe("validateApiRequest", () => {
			it("should return success for valid data", async () => {
				const schema = z.object({ name: z.string() });
				const mockRequest = new Request("http://localhost", {
					method: "POST",
					body: JSON.stringify({ name: "Test" }),
					headers: { "Content-Type": "application/json" },
				});
				const result = await validateApiRequest(mockRequest, schema);

				expect(result.success).toBe(true);
				expect(result.error).toBeUndefined();
				if (result.success) {
					expect(result.data?.name).toBe("Test");
				}
			});

			it("should return error for invalid data", async () => {
				const schema = z.object({ name: z.string() });
				const mockRequest = new Request("http://localhost", {
					method: "POST",
					body: JSON.stringify({ name: 123 }),
					headers: { "Content-Type": "application/json" },
				});
				const result = await validateApiRequest(mockRequest, schema);

				expect(result.success).toBe(false);
				expect(result.data).toBeUndefined();
				expect(result.error).toContain("Validation failed");
			});

			it("should handle non-Zod errors", async () => {
				const schema = z.object({ name: z.string() });
				const mockRequest = new Request("http://localhost", {
					method: "POST",
					body: "invalid json",
					headers: { "Content-Type": "application/json" },
				});
				const result = await validateApiRequest(mockRequest, schema);

				expect(result.success).toBe(false);
				expect(result.data).toBeUndefined();
				expect(result.error).toBe("Invalid JSON in request body");
			});
		});

		describe("createApiSuccessResponse", () => {
			it("should create success response with data", () => {
				const data = { id: "123", name: "Test" };
				const response = createApiSuccessResponse(data, "Success message");

				expect(response.success).toBe(true);
				expect(response.data).toEqual(data);
				expect(response.message).toBe("Success message");
				expect(response.meta).toBeDefined();
				expect(response.meta.timestamp).toBeDefined();
				expect(response.meta.version).toBe("1.0.0");
				expect(response.meta.requestId).toBeDefined();
			});

			it("should create success response without message", () => {
				const data = { id: "123", name: "Test" };
				const response = createApiSuccessResponse(data);

				expect(response.success).toBe(true);
				expect(response.data).toEqual(data);
				expect(response.message).toBeUndefined();
			});
		});

		describe("createApiErrorResponse", () => {
			it("should create error response with defaults", () => {
				const response = createApiErrorResponse("Test error");

				expect(response.success).toBe(false);
				expect(response.error.code).toBe("HTTP_400");
				expect(response.error.message).toBe("Test error");
				expect(response.message).toBe("Test error");
				expect(response.statusCode).toBe(400);
				expect(response.timestamp).toBeDefined();
				expect(response.validationErrors).toBeUndefined();
			});

			it("should create error response with custom values", () => {
				const validationErrors = [{ field: "email", message: "Invalid email" }];
				const response = createApiErrorResponse("Validation failed", 422, validationErrors);

				expect(response.success).toBe(false);
				expect(response.error.code).toBe("HTTP_422");
				expect(response.error.message).toBe("Validation failed");
				expect(response.statusCode).toBe(422);
				expect(response.validationErrors).toEqual(validationErrors);
			});
		});

		describe("createPaginatedResponse", () => {
			it("should create paginated response", () => {
				const data = [
					{ id: "1", name: "User 1" },
					{ id: "2", name: "User 2" },
				];
				const pagination = { page: 1, limit: 10, total: 25 };
				const response = createPaginatedResponse(data, pagination);

				expect(response.success).toBe(true);
				expect(response.data).toEqual(data);
				expect(response.pagination.page).toBe(1);
				expect(response.pagination.limit).toBe(10);
				expect(response.pagination.total).toBe(25);
				expect(response.pagination.totalPages).toBe(3);
				expect(response.pagination.hasNext).toBe(true);
				expect(response.pagination.hasPrev).toBe(false);
			});

			it("should calculate pagination correctly for last page", () => {
				const data = [{ id: "1", name: "User 1" }];
				const pagination = { page: 3, limit: 10, total: 25 };
				const response = createPaginatedResponse(data, pagination);

				expect(response.pagination.totalPages).toBe(3);
				expect(response.pagination.hasNext).toBe(false);
				expect(response.pagination.hasPrev).toBe(true);
			});

			it("should handle exact page divisions", () => {
				const data = [{ id: "1", name: "User 1" }];
				const pagination = { page: 2, limit: 10, total: 20 };
				const response = createPaginatedResponse(data, pagination);

				expect(response.pagination.totalPages).toBe(2);
				expect(response.pagination.hasNext).toBe(false);
				expect(response.pagination.hasPrev).toBe(true);
			});
		});
	});
});
