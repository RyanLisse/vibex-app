import { ComponentLogger } from "../../logging";
import type { CriticalError } from "../types";
import { DiscordTransport } from "./discord-transport";
import { EmailTransport } from "./email-transport";
import { LogTransport } from "./log-transport";
import { SlackTransport } from "./slack-transport";
import { TeamsTransport } from "./teams-transport";
import type { AlertChannel, AlertNotification, AlertTransportConfig, BaseTransport } from "./types";
import { AlertChannelType } from "./types";
// Import transports
import { WebhookTransport } from "./webhook-transport";

export class AlertTransportService {
	private transports: Map<AlertChannelType, BaseTransport> = new Map();
	private logger: ComponentLogger;

	constructor(private config: AlertTransportConfig[]) {
		this.logger = new ComponentLogger("AlertTransportService");
		this.initializeTransports();
	}

	private initializeTransports(): void {
		// Register all available transports
		const availableTransports: BaseTransport[] = [
			new WebhookTransport(),
			new EmailTransport(),
			new SlackTransport(),
			new DiscordTransport(),
			new TeamsTransport(),
			new LogTransport(),
		];

		for (const transport of availableTransports) {
			this.transports.set(transport.type, transport);
		}

		this.logger.info("Alert transports initialized", {
			availableTransports: Array.from(this.transports.keys()),
			configuredTransports: this.config.length,
		});
	}

	async send(
		channel: AlertChannel,
		error: CriticalError,
		notification: AlertNotification
	): Promise<void> {
		const transport = this.transports.get(channel.type);

		if (!transport) {
			throw new Error(`Transport not found for channel type: ${channel.type}`);
		}

		// Validate channel configuration
		if (!transport.validateConfig(channel.config)) {
			throw new Error(`Invalid configuration for ${channel.type} transport`);
		}

		const startTime = Date.now();

		try {
			await this.sendWithRetry(transport, channel, error, notification);

			const duration = Date.now() - startTime;
			this.logger.info("Alert sent successfully", {
				transport: transport.name,
				channel: channel.name,
				alertId: error.id,
				duration,
			});
		} catch (sendError) {
			const duration = Date.now() - startTime;
			this.logger.error("Failed to send alert", {
				transport: transport.name,
				channel: channel.name,
				alertId: error.id,
				duration,
				error: sendError instanceof Error ? sendError.message : "Unknown error",
			});
			throw sendError;
		}
	}

	private async sendWithRetry(
		transport: BaseTransport,
		channel: AlertChannel,
		error: CriticalError,
		notification: AlertNotification
	): Promise<void> {
		const transportConfig = this.config.find((c) => c.type === channel.type);
		const retryConfig = transportConfig?.retryConfig || {
			maxRetries: 3,
			retryDelay: 1000,
			exponentialBackoff: true,
		};

		let lastError: Error | null = null;

		for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
			try {
				await transport.send(channel, error, notification);
				return; // Success
			} catch (sendError) {
				lastError = sendError as Error;

				this.logger.warn("Transport send attempt failed", {
					transport: transport.name,
					channel: channel.name,
					attempt: attempt + 1,
					maxRetries: retryConfig.maxRetries,
					error: lastError.message,
				});

				// If it's the last attempt, don't wait
				if (attempt === retryConfig.maxRetries - 1) {
					break;
				}

				// Calculate retry delay
				let delay = retryConfig.retryDelay;
				if (retryConfig.exponentialBackoff) {
					delay = Math.min(retryConfig.retryDelay * 2 ** attempt, 30000);
				}

				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw lastError || new Error("Transport send failed after all retries");
	}

	async sendAlert(error: CriticalError): Promise<void> {
		this.logger.info("Processing alert for transport", {
			alertId: error.id,
			type: error.type,
			severity: error.severity,
		});

		// This method is kept for backward compatibility
		// In practice, the AlertManager should call the `send` method directly
		// with specific channels

		const defaultChannel: AlertChannel = {
			type: AlertChannelType.LOG,
			name: "default-log",
			enabled: true,
			config: {
				level: "error",
				format: "json",
				includeStackTrace: true,
			},
			errorTypes: [error.type],
			priority: "medium",
		};

		const defaultNotification: AlertNotification = {
			id: `notif-${Date.now()}`,
			alertId: error.id,
			channelType: defaultChannel.type,
			channelName: defaultChannel.name,
			status: "pending" as any,
			retryCount: 0,
			maxRetries: 3,
		};

		await this.send(defaultChannel, error, defaultNotification);
	}

	addTransport(name: string, transport: BaseTransport): void {
		this.transports.set(transport.type, transport);
		this.logger.info("Transport added", {
			name,
			type: transport.type,
		});
	}

	removeTransport(type: AlertChannelType): void {
		if (this.transports.delete(type)) {
			this.logger.info("Transport removed", { type });
		}
	}

	getAvailableTransports(): AlertChannelType[] {
		return Array.from(this.transports.keys());
	}

	validateChannelConfig(channel: AlertChannel): boolean {
		const transport = this.transports.get(channel.type);
		if (!transport) {
			return false;
		}
		return transport.validateConfig(channel.config);
	}

	async testChannel(channel: AlertChannel): Promise<boolean> {
		try {
			const testError: CriticalError = {
				id: `test-${Date.now()}`,
				type: "system_health_failure" as any,
				message: "Test alert from AlertTransportService",
				severity: "low" as any,
				timestamp: new Date(),
				source: "test",
				environment: "test",
				resolved: false,
				occurrenceCount: 1,
				firstOccurrence: new Date(),
				lastOccurrence: new Date(),
				metadata: { test: true },
			};

			const testNotification: AlertNotification = {
				id: `test-notif-${Date.now()}`,
				alertId: testError.id,
				channelType: channel.type,
				channelName: channel.name,
				status: "pending" as any,
				retryCount: 0,
				maxRetries: 1, // Only one attempt for test
			};

			await this.send(channel, testError, testNotification);
			return true;
		} catch (error) {
			this.logger.error("Channel test failed", {
				channel: channel.name,
				type: channel.type,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			return false;
		}
	}
}
