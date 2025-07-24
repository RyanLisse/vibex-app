/**
 * TestDataBuilder - Comprehensive Test Data Generation and Management
 *
 * Provides builders and factories for creating consistent test data
 */

export interface TestDataOptions {
	seed?: number;
	locale?: string;
	count?: number;
	overrides?: Record<string, unknown>;
}

export interface UserTestData {
	id: string;
	email: string;
	name: string;
	role: "admin" | "user" | "guest";
	createdAt: Date;
	lastLoginAt?: Date;
	preferences: UserPreferences;
	profile: UserProfile;
}

export interface UserPreferences {
	theme: "light" | "dark" | "auto";
	language: string;
	notifications: boolean;
	timezone: string;
}

export interface UserProfile {
	firstName: string;
	lastName: string;
	avatar?: string;
	bio?: string;
	company?: string;
	location?: string;
}

export interface TaskTestData {
	id: string;
	title: string;
	description: string;
	status: "pending" | "in-progress" | "completed" | "cancelled";
	priority: "low" | "medium" | "high" | "urgent";
	assigneeId?: string;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
	dueDate?: Date;
	tags: string[];
	metadata: Record<string, unknown>;
}

export interface AgentTestData {
	id: string;
	name: string;
	type: "code-gen" | "code-review" | "brainstorm" | "research";
	provider: "openai" | "anthropic" | "google" | "local";
	model: string;
	status: "active" | "inactive" | "error";
	config: AgentConfig;
	metrics: AgentMetrics;
	createdAt: Date;
}

export interface AgentConfig {
	temperature: number;
	maxTokens: number;
	systemPrompt: string;
	tools: string[];
	memoryEnabled: boolean;
}

export interface AgentMetrics {
	totalExecutions: number;
	successRate: number;
	avgExecutionTime: number;
	totalTokensUsed: number;
	totalCost: number;
}

export interface SessionTestData {
	id: string;
	userId: string;
	deviceId: string;
	ipAddress: string;
	userAgent: string;
	createdAt: Date;
	expiresAt: Date;
	lastActivityAt: Date;
	isActive: boolean;
	metadata: SessionMetadata;
}

export interface SessionMetadata {
	browser: string;
	os: string;
	device: string;
	location?: string;
	referrer?: string;
}

export class TestDataBuilder {
	private seed: number;
	private locale: string;
	private counter = 0;

	constructor(options: TestDataOptions = {}) {
		this.seed = options.seed ?? Date.now();
		this.locale = options.locale ?? "en-US";
		this.seedRandom();
	}

	/**
	 * Build user test data
	 */
	buildUser(overrides: Partial<UserTestData> = {}): UserTestData {
		const id = this.generateId("user");
		const firstName = this.generateFirstName();
		const lastName = this.generateLastName();

		return {
			id,
			email: this.generateEmail(firstName, lastName),
			name: `${firstName} ${lastName}`,
			role: this.randomChoice(["admin", "user", "guest"]),
			createdAt: this.generatePastDate(365),
			lastLoginAt: this.randomBoolean() ? this.generatePastDate(30) : undefined,
			preferences: this.buildUserPreferences(),
			profile: this.buildUserProfile(firstName, lastName),
			...overrides,
		};
	}

	/**
	 * Build multiple users
	 */
	buildUsers(count: number, overrides: Partial<UserTestData> = {}): UserTestData[] {
		return Array.from({ length: count }, () => this.buildUser(overrides));
	}

	/**
	 * Build task test data
	 */
	buildTask(overrides: Partial<TaskTestData> = {}): TaskTestData {
		const createdAt = this.generatePastDate(90);

		return {
			id: this.generateId("task"),
			title: this.generateTaskTitle(),
			description: this.generateTaskDescription(),
			status: this.randomChoice(["pending", "in-progress", "completed", "cancelled"]),
			priority: this.randomChoice(["low", "medium", "high", "urgent"]),
			assigneeId: this.randomBoolean() ? this.generateId("user") : undefined,
			createdBy: this.generateId("user"),
			createdAt,
			updatedAt: this.generateDateAfter(createdAt, 30),
			dueDate: this.randomBoolean() ? this.generateFutureDate(30) : undefined,
			tags: this.generateTags(),
			metadata: this.generateMetadata(),
			...overrides,
		};
	}

	/**
	 * Build multiple tasks
	 */
	buildTasks(count: number, overrides: Partial<TaskTestData> = {}): TaskTestData[] {
		return Array.from({ length: count }, () => this.buildTask(overrides));
	}

	/**
	 * Build agent test data
	 */
	buildAgent(overrides: Partial<AgentTestData> = {}): AgentTestData {
		const type = this.randomChoice(["code-gen", "code-review", "brainstorm", "research"]);
		const provider = this.randomChoice(["openai", "anthropic", "google", "local"]);

		return {
			id: this.generateId("agent"),
			name: this.generateAgentName(type),
			type,
			provider,
			model: this.generateModelName(provider),
			status: this.randomChoice(["active", "inactive", "error"]),
			config: this.buildAgentConfig(),
			metrics: this.buildAgentMetrics(),
			createdAt: this.generatePastDate(180),
			...overrides,
		};
	}

	/**
	 * Build session test data
	 */
	buildSession(overrides: Partial<SessionTestData> = {}): SessionTestData {
		const createdAt = this.generatePastDate(7);
		const expiresAt = this.generateDateAfter(createdAt, 30);

		return {
			id: this.generateId("session"),
			userId: this.generateId("user"),
			deviceId: this.generateId("device"),
			ipAddress: this.generateIpAddress(),
			userAgent: this.generateUserAgent(),
			createdAt,
			expiresAt,
			lastActivityAt: this.generateDateAfter(createdAt, 7),
			isActive: this.randomBoolean(0.7),
			metadata: this.buildSessionMetadata(),
			...overrides,
		};
	}

	/**
	 * Build realistic test dataset
	 */
	buildDataset(
		options: { users?: number; tasks?: number; agents?: number; sessions?: number } = {}
	): {
		users: UserTestData[];
		tasks: TaskTestData[];
		agents: AgentTestData[];
		sessions: SessionTestData[];
	} {
		const users = this.buildUsers(options.users ?? 10);
		const agents = Array.from({ length: options.agents ?? 5 }, () => this.buildAgent());

		// Create tasks assigned to users
		const tasks = Array.from({ length: options.tasks ?? 25 }, () =>
			this.buildTask({
				assigneeId: this.randomChoice(users).id,
				createdBy: this.randomChoice(users).id,
			})
		);

		// Create sessions for users
		const sessions = users.flatMap((user) =>
			Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () =>
				this.buildSession({ userId: user.id })
			)
		);

		return { users, tasks, agents, sessions };
	}

	/**
	 * Reset builder state
	 */
	reset(seed?: number): void {
		this.seed = seed ?? Date.now();
		this.counter = 0;
		this.seedRandom();
	}

	private seedRandom(): void {
		// Simple seeded random implementation
		Math.random = () => {
			this.seed = (this.seed * 9301 + 49297) % 233280;
			return this.seed / 233280;
		};
	}

	private generateId(prefix: string): string {
		return `${prefix}-${Date.now()}-${++this.counter}`;
	}

	private generateFirstName(): string {
		const names = [
			"Alice",
			"Bob",
			"Charlie",
			"Diana",
			"Eve",
			"Frank",
			"Grace",
			"Henry",
			"Ivy",
			"Jack",
		];
		return this.randomChoice(names);
	}

	private generateLastName(): string {
		const names = [
			"Smith",
			"Johnson",
			"Williams",
			"Brown",
			"Jones",
			"Garcia",
			"Miller",
			"Davis",
			"Rodriguez",
			"Martinez",
		];
		return this.randomChoice(names);
	}

	private generateEmail(firstName: string, lastName: string): string {
		const domains = ["example.com", "test.org", "demo.net"];
		return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${this.randomChoice(domains)}`;
	}

	private buildUserPreferences(): UserPreferences {
		return {
			theme: this.randomChoice(["light", "dark", "auto"]),
			language: this.randomChoice(["en", "es", "fr", "de", "ja"]),
			notifications: this.randomBoolean(),
			timezone: this.randomChoice(["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"]),
		};
	}

	private buildUserProfile(firstName: string, lastName: string): UserProfile {
		return {
			firstName,
			lastName,
			avatar: this.randomBoolean()
				? `https://avatar.example.com/${firstName.toLowerCase()}`
				: undefined,
			bio: this.randomBoolean() ? "Software developer and tech enthusiast" : undefined,
			company: this.randomBoolean()
				? this.randomChoice(["TechCorp", "DevStudio", "CodeWorks"])
				: undefined,
			location: this.randomBoolean()
				? this.randomChoice(["New York", "London", "Tokyo", "Berlin"])
				: undefined,
		};
	}

	private generateTaskTitle(): string {
		const actions = ["Implement", "Fix", "Update", "Refactor", "Add", "Remove", "Optimize"];
		const subjects = [
			"user authentication",
			"API endpoints",
			"database schema",
			"UI components",
			"test coverage",
		];
		return `${this.randomChoice(actions)} ${this.randomChoice(subjects)}`;
	}

	private generateTaskDescription(): string {
		return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
	}

	private generateTags(): string[] {
		const allTags = [
			"frontend",
			"backend",
			"api",
			"database",
			"testing",
			"security",
			"performance",
			"ui",
			"ux",
		];
		const count = Math.floor(Math.random() * 4) + 1;
		return this.shuffleArray(allTags).slice(0, count);
	}

	private generateMetadata(): Record<string, unknown> {
		return {
			estimatedHours: Math.floor(Math.random() * 40) + 1,
			complexity: this.randomChoice(["low", "medium", "high"]),
			sprint: `Sprint ${Math.floor(Math.random() * 10) + 1}`,
		};
	}

	private generateAgentName(type: string): string {
		const prefixes = {
			"code-gen": ["CodeGen", "Generator", "Builder"],
			"code-review": ["Reviewer", "Analyzer", "Inspector"],
			brainstorm: ["Ideator", "Creator", "Thinker"],
			research: ["Researcher", "Explorer", "Investigator"],
		};
		return `${this.randomChoice(prefixes[type as keyof typeof prefixes])} Agent`;
	}

	private generateModelName(provider: string): string {
		const models = {
			openai: ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
			anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
			google: ["gemini-pro", "gemini-ultra", "palm-2"],
			local: ["llama-2", "mistral-7b", "codellama"],
		};
		return this.randomChoice(models[provider as keyof typeof models]);
	}

	private buildAgentConfig(): AgentConfig {
		return {
			temperature: Math.round(Math.random() * 2 * 100) / 100,
			maxTokens: this.randomChoice([1000, 2000, 4000, 8000]),
			systemPrompt: "You are a helpful AI assistant.",
			tools: this.shuffleArray(["web_search", "code_execution", "file_system"]).slice(0, 2),
			memoryEnabled: this.randomBoolean(),
		};
	}

	private buildAgentMetrics(): AgentMetrics {
		const executions = Math.floor(Math.random() * 1000) + 10;
		return {
			totalExecutions: executions,
			successRate: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
			avgExecutionTime: Math.round((Math.random() * 5000 + 500) * 100) / 100,
			totalTokensUsed: executions * (Math.floor(Math.random() * 2000) + 100),
			totalCost: Math.round((executions * 0.002 + Math.random() * 10) * 100) / 100,
		};
	}

	private generateIpAddress(): string {
		return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
	}

	private generateUserAgent(): string {
		const browsers = [
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
		];
		return this.randomChoice(browsers);
	}

	private buildSessionMetadata(): SessionMetadata {
		return {
			browser: this.randomChoice(["Chrome", "Firefox", "Safari", "Edge"]),
			os: this.randomChoice(["Windows", "macOS", "Linux", "iOS", "Android"]),
			device: this.randomChoice(["Desktop", "Mobile", "Tablet"]),
			location: this.randomBoolean()
				? this.randomChoice(["US", "UK", "CA", "DE", "JP"])
				: undefined,
			referrer: this.randomBoolean() ? "https://google.com" : undefined,
		};
	}

	private generatePastDate(maxDaysAgo: number): Date {
		const daysAgo = Math.floor(Math.random() * maxDaysAgo);
		return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
	}

	private generateFutureDate(maxDaysAhead: number): Date {
		const daysAhead = Math.floor(Math.random() * maxDaysAhead) + 1;
		return new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
	}

	private generateDateAfter(baseDate: Date, maxDaysAfter: number): Date {
		const daysAfter = Math.floor(Math.random() * maxDaysAfter);
		return new Date(baseDate.getTime() + daysAfter * 24 * 60 * 60 * 1000);
	}

	private randomChoice<T>(array: T[]): T {
		return array[Math.floor(Math.random() * array.length)];
	}

	private randomBoolean(probability = 0.5): boolean {
		return Math.random() < probability;
	}

	private shuffleArray<T>(array: T[]): T[] {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}
}
