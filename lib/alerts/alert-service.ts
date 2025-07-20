import type Redis from "ioredis";
import { ComponentLogger } from "../logging/logger-factory";
import { AlertManager } from "./alert-manager";
import { AlertWinstonTransport } from "./alert-winston-transport";
import { CriticalErrorDetector } from "./critical-error-detector";
import { AlertTransportService } from "./transport/alert-transport-service";
	type AlertChannel,
	AlertChannelType,
	type AlertConfig,
	CriticalErrorType,
} from "./types";

export class AlertService {
	private readonly logger: ComponentLogger;
	private readonly detector: CriticalErrorDetector;
	private readonly alertManager: AlertManager;
	private readonly transportService: AlertTransportService;
	private readonly winstonTransport: AlertWinstonTransport;
	private alertConfig: AlertConfig;
	private initialized = false;

	constructor(redis: Redis, config?: AlertConfig) {
		this.logger = new ComponentLogger("AlertService");
		this.detector = new CriticalErrorDetector();
		this.transportService = new AlertTransportService();
		this.alertManager = new AlertManager(redis, this.transportService);
		this.alertConfig = config || this.getDefaultConfig();
		this.winstonTransport = new AlertWinstonTransport({
			alertManager: this.alertManager,
			detector: this.detector,
			alertConfig: this.alertConfig,
		});
	}

	private getDefaultConfig(): AlertConfig {
		return {
			enabled: process.env.ALERTS_ENABLED !== "false",
			channels: this.getDefaultChannels(),
			rateLimiting: {
				maxAlertsPerHour: Number.parseInt(
					process.env.ALERTS_MAX_PER_HOUR || "10",
				),
				cooldownMinutes: Number.parseInt(
					process.env.ALERTS_COOLDOWN_MINUTES || "15",
				),
			},
			deduplication: {
				enabled: process.env.ALERTS_DEDUPLICATION_ENABLED !== "false",
				windowMinutes: Number.parseInt(
					process.env.ALERTS_DEDUPLICATION_WINDOW || "60",
				),
			},
			escalation: {
				enabled: process.env.ALERTS_ESCALATION_ENABLED === "true",
				escalateAfterMinutes: Number.parseInt(
					process.env.ALERTS_ESCALATION_AFTER_MINUTES || "30",
				),
				escalationChannels: [],
			},
		};
	}

	private getDefaultChannels(): AlertChannel[] {
		const channels: AlertChannel[] = [];

		// Always include log transport
		channels.push({
			type: AlertChannelType.LOG,
			name: "default-log",
			enabled: true,
			config: {
				level: "error",
				format: "structured",
				includeStackTrace: true,
				includeMetadata: true,
			},
			errorTypes: Object.values(CriticalErrorType),
			priority: "medium",
		});

		// Add webhook if configured
		if (process.env.ALERTS_WEBHOOK_URL) {
			channels.push({
				type: AlertChannelType.WEBHOOK,
				name: "default-webhook",
				enabled: true,
				config: {
					url: process.env.ALERTS_WEBHOOK_URL,
					method: "POST",
					timeout: 30_000,
					retries: 3,
					...(process.env.ALERTS_WEBHOOK_TOKEN && {
						authentication: {
							type: "bearer",
							token: process.env.ALERTS_WEBHOOK_TOKEN,
						},
					}),
				},
				errorTypes: Object.values(CriticalErrorType),
				priority: "high",
			});
		}

		// Add Slack if configured
		if (
			process.env.ALERTS_SLACK_WEBHOOK_URL ||
			process.env.ALERTS_SLACK_BOT_TOKEN
		) {
			channels.push({
				type: AlertChannelType.SLACK,
				name: "default-slack",
				enabled: true,
				config: {
					...(process.env.ALERTS_SLACK_WEBHOOK_URL && {
						webhookUrl: process.env.ALERTS_SLACK_WEBHOOK_URL,
					}),
					...(process.env.ALERTS_SLACK_BOT_TOKEN && {
						botToken: process.env.ALERTS_SLACK_BOT_TOKEN,
					}),
					channel: process.env.ALERTS_SLACK_CHANNEL || "#alerts",
					username: "ClaudeFlow Alerts",
					iconEmoji: ":rotating_light:",
					mentionChannel: process.env.ALERTS_SLACK_MENTION_CHANNEL === "true",
					...(process.env.ALERTS_SLACK_MENTION_USERS && {
						mentionUsers: process.env.ALERTS_SLACK_MENTION_USERS.split(","),
					}),
				},
				errorTypes: [
					CriticalErrorType.DATABASE_CONNECTION_FAILURE,
					CriticalErrorType.REDIS_CONNECTION_FAILURE,
					CriticalErrorType.AUTH_SERVICE_FAILURE,
					CriticalErrorType.SYSTEM_HEALTH_FAILURE,
					CriticalErrorType.MEMORY_THRESHOLD_EXCEEDED,
				],
				priority: "critical",
			});
		}

		// Add email if configured
		if (process.env.ALERTS_EMAIL_FROM && process.env.ALERTS_EMAIL_TO) {
			const emailConfig: any = {
				provider: process.env.ALERTS_EMAIL_PROVIDER || "smtp",
				from: process.env.ALERTS_EMAIL_FROM,
				to: process.env.ALERTS_EMAIL_TO.split(","),
			};

			if (process.env.ALERTS_EMAIL_CC) {
				emailConfig.cc = process.env.ALERTS_EMAIL_CC.split(",");
			}

			if (process.env.ALERTS_EMAIL_PROVIDER === "smtp") {
				emailConfig.smtp = {
					host: process.env.ALERTS_SMTP_HOST,
					port: Number.parseInt(process.env.ALERTS_SMTP_PORT || "587"),
					secure: process.env.ALERTS_SMTP_SECURE === "true",
					username: process.env.ALERTS_SMTP_USERNAME,
					password: process.env.ALERTS_SMTP_PASSWORD,
				};
			} else {
				emailConfig.apiKey = process.env.ALERTS_EMAIL_API_KEY;
				if (process.env.ALERTS_EMAIL_REGION) {
					emailConfig.region = process.env.ALERTS_EMAIL_REGION;
				}
			}

			channels.push({
				type: AlertChannelType.EMAIL,
				name: "default-email",
				enabled: true,
				config: emailConfig,
				errorTypes: [
					CriticalErrorType.DATABASE_CONNECTION_FAILURE,
					CriticalErrorType.AUTH_SERVICE_FAILURE,
					CriticalErrorType.SYSTEM_HEALTH_FAILURE,
					CriticalErrorType.MEMORY_THRESHOLD_EXCEEDED,
				],
				priority: "critical",
			});
		}

		return channels;
	}

	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		try {
			// Validate all channel configurations
			const invalidChannels = this.alertConfig.channels.filter(
				(channel) => !this.transportService.validateChannelConfig(channel),
			);

			if (invalidChannels.length > 0) {
				this.logger.warn("Invalid alert channel configurations found", {
					invalidChannels: invalidChannels.map((c) => c.name),
				});

				// Remove invalid channels
				this.alertConfig.channels = this.alertConfig.channels.filter(
					(channel) => this.transportService.validateChannelConfig(channel),
				);
			}

			this.initialized = true;

			this.logger.info("Alert service initialized", {
				enabled: this.alertConfig.enabled,
				channelCount: this.alertConfig.channels.length,
				enabledChannels: this.alertConfig.channels.filter((c) => c.enabled)
					.length,
				channels: this.alertConfig.channels.map((c) => ({
					name: c.name,
					type: c.type,
					enabled: c.enabled,
				})),
			});
		} catch (error) {
			this.logger.error("Failed to initialize alert service", {
				error: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	}

	getWinstonTransport(): AlertWinstonTransport {
		return this.winstonTransport;
	}

	async updateConfig(config: AlertConfig): Promise<void> {
		this.alertConfig = config;
		this.winstonTransport.updateAlertConfig(config);

		this.logger.info("Alert configuration updated", {
			enabled: config.enabled,
			channelCount: config.channels.length,
		});
	}

	async addChannel(channel: AlertChannel): Promise<void> {
		if (!this.transportService.validateChannelConfig(channel)) {
			throw new Error(`Invalid channel configuration: ${channel.name}`);
		}

		this.alertConfig.channels.push(channel);

		this.logger.info("Alert channel added", {
			name: channel.name,
			type: channel.type,
			enabled: channel.enabled,
		});
	}

	async removeChannel(channelName: string): Promise<void> {
		const initialLength = this.alertConfig.channels.length;
		this.alertConfig.channels = this.alertConfig.channels.filter(
			(c) => c.name !== channelName,
		);

		if (this.alertConfig.channels.length < initialLength) {
			this.logger.info("Alert channel removed", { name: channelName });
		} else {
			this.logger.warn("Alert channel not found for removal", {
				name: channelName,
			});
		}
	}

	async enableChannel(channelName: string): Promise<void> {
		const channel = this.alertConfig.channels.find(
			(c) => c.name === channelName,
		);
		if (channel) {
			channel.enabled = true;
			this.logger.info("Alert channel enabled", { name: channelName });
		} else {
			this.logger.warn("Alert channel not found", { name: channelName });
		}
	}

	async disableChannel(channelName: string): Promise<void> {
		const channel = this.alertConfig.channels.find(
			(c) => c.name === channelName,
		);
		if (channel) {
			channel.enabled = false;
			this.logger.info("Alert channel disabled", { name: channelName });
		} else {
			this.logger.warn("Alert channel not found", { name: channelName });
		}
	}

	addCustomErrorPattern(type: CriticalErrorType, pattern: RegExp): void {
		this.detector.addCustomPattern(type, pattern);
		this.winstonTransport.addCustomErrorPattern(type, pattern);

		this.logger.info("Custom error pattern added", {
			type,
			pattern: pattern.source,
		});
	}

	async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
		return await this.alertManager.resolveAlert(alertId, resolvedBy);
	}

	async getActiveAlerts() {
		return await this.alertManager.getActiveAlerts();
	}

	async getAlertHistory(limit?: number) {
		return await this.alertManager.getAlertHistory(limit);
	}

	getConfig(): AlertConfig {
		return { ...this.alertConfig };
	}

	getSupportedChannelTypes(): AlertChannelType[] {
		return this.transportService.getSupportedChannelTypes();
	}

	isEnabled(): boolean {
		return this.alertConfig.enabled && this.initialized;
	}

	async testChannel(channelName: string): Promise<boolean> {
		const channel = this.alertConfig.channels.find(
			(c) => c.name === channelName,
		);
		if (!channel) {
			throw new Error(`Channel not found: ${channelName}`);
		}

		try {
			// Create a test critical error
			const testError = {
				id: "test-" + Date.now(),
				timestamp: new Date(),
				severity: "medium" as const,
				type: CriticalErrorType.SYSTEM_HEALTH_FAILURE,
				message: "Test alert from ClaudeFlow Alert System",
				source: "alert-service-test",
				metadata: { test: true },
				environment: process.env.NODE_ENV || "development",
				resolved: false,
				occurrenceCount: 1,
				lastOccurrence: new Date(),
				firstOccurrence: new Date(),
			};

			const testNotification = {
				id: "test-notif-" + Date.now(),
				alertId: testError.id,
				channelType: channel.type,
				channelName: channel.name,
				status: "pending" as const,
				retryCount: 0,
				maxRetries: 1,
			};

			await this.transportService.send(channel, testError, testNotification);

			this.logger.info("Test alert sent successfully", {
				channel: channelName,
				type: channel.type,
			});

			return true;
		} catch (error) {
			this.logger.error("Test alert failed", {
				channel: channelName,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			return false;
		}
	}
}
