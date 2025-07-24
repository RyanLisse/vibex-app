import type Redis from "ioredis";
import { ComponentLogger } from "@/lib/logging/specialized-loggers";
import { AlertManager } from "./alert-manager";
import { AlertWinstonTransport } from "./alert-winston-transport";
import { CriticalErrorDetector } from "./critical-error-detector";
import { AlertTransportService } from "./transport/alert-transport-service";
import {
	type AlertChannel,
	AlertChannelType,
	type AlertConfig,
	type CriticalError,
	CriticalErrorType,
} from "./types";

export class AlertService {
	private readonly logger: ComponentLogger;
	private readonly detector: CriticalErrorDetector;
	private readonly alertManager: AlertManager;
	private readonly transportService: AlertTransportService;
	private readonly winstonTransport: AlertWinstonTransport;
	private readonly criticalErrorDetector: CriticalErrorDetector;
	private alertConfig: AlertConfig;
	private initialized = false;
	private channels: Array<{
		channel: AlertChannel;
		errorTypes: CriticalErrorType[];
	}> = [];
	private alertHistory: CriticalError[] = [];
	private activeAlerts = new Map<string, CriticalError>();

	constructor(redis: Redis, config?: AlertConfig) {
		this.logger = new ComponentLogger("AlertService");
		this.detector = new CriticalErrorDetector();
		this.criticalErrorDetector = this.detector;
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
				maxAlertsPerHour: Number.parseInt(process.env.ALERTS_MAX_PER_HOUR || "10"),
				cooldownMinutes: Number.parseInt(process.env.ALERTS_COOLDOWN_MINUTES || "15"),
			},
			deduplication: {
				enabled: process.env.ALERTS_DEDUPLICATION_ENABLED !== "false",
				windowMinutes: Number.parseInt(process.env.ALERTS_DEDUPLICATION_WINDOW || "60"),
			},
			escalation: {
				enabled: process.env.ALERTS_ESCALATION_ENABLED === "true",
				escalateAfterMinutes: Number.parseInt(process.env.ALERTS_ESCALATION_AFTER_MINUTES || "30"),
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
		if (process.env.ALERTS_SLACK_WEBHOOK_URL || process.env.ALERTS_SLACK_BOT_TOKEN) {
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
					CriticalErrorType.API_RATE_LIMIT_EXCEEDED,
					CriticalErrorType.AUTHENTICATION_FAILURE,
					CriticalErrorType.DATA_CORRUPTION,
					CriticalErrorType.SERVICE_UNAVAILABLE,
				],
				priority: "high",
			});
		}

		return channels;
	}

	async initialize() {
		if (this.initialized) {
			return;
		}

		this.logger.info("Initializing alert service");

		// Initialize components
		await this.alertManager.initialize();
		this.detector.start();

		// Get channel configs
		const channelConfigs = this.alertConfig.channels;

		// Initialize all configured channels
		for (const config of channelConfigs) {
			if (config.enabled) {
				const channel = await this.transportService.createChannel(config.type, config.config);
				if (channel) {
					this.channels.push({
						channel,
						errorTypes: config.errorTypes || [],
					});
				}
			}
		}

		// Register with critical error detector
		if (this.criticalErrorDetector) {
			this.criticalErrorDetector.onCriticalError(async (error) => {
				await this.sendAlert({
					title: `Critical Error: ${error.type}`,
					message: error.message,
					severity: "critical",
					timestamp: new Date(),
					type: error.type,
					context: error.context,
					stackTrace: error.stackTrace,
				});
			});
		}

		this.initialized = true;
		this.logger.info("Alert service initialized", {
			channels: this.channels.length,
		});
	}

	async sendAlert(alert: CriticalError): Promise<void> {
		if (!this.initialized) {
			throw new Error("Alert service not initialized");
		}

		const relevantChannels = this.channels.filter(
			(ch) => ch.errorTypes.length === 0 || ch.errorTypes.includes(alert.type)
		);

		await Promise.all(
			relevantChannels.map((ch) =>
				ch.channel.send(alert).catch((error) => {
					this.logger.error("Failed to send alert", error);
				})
			)
		);

		// Store in history
		this.alertHistory.unshift(alert);
		if (this.alertHistory.length > 1000) {
			this.alertHistory.pop();
		}

		// Track active alerts
		const alertKey = `${alert.type}-${alert.message}`;
		this.activeAlerts.set(alertKey, alert);
	}

	async getActiveAlerts(): Promise<CriticalError[]> {
		return Array.from(this.activeAlerts.values());
	}

	async getAlertHistory(limit = 100): Promise<CriticalError[]> {
		return this.alertHistory.slice(0, limit);
	}

	async clearAlert(alertId: string): Promise<void> {
		this.activeAlerts.delete(alertId);
	}
}
