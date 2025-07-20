import { ComponentLogger } from "../../logging/logger-factory";
import type { AlertChannel, AlertNotification, CriticalError } from "../types";
import type { AlertTransport } from "./types";

interface SlackConfig {
	webhookUrl?: string;
	botToken?: string;
	channel: string;
	username?: string;
	iconEmoji?: string;
	iconUrl?: string;
	mentionUsers?: string[];
	mentionChannel?: boolean;
	threadKey?: string;
}

interface SlackAttachment {
	color: string;
	title: string;
	text: string;
	fields: Array<{
		title: string;
		value: string;
		short: boolean;
	}>;
	footer: string;
	ts: number;
}

export class SlackTransport implements AlertTransport {
	private readonly logger: ComponentLogger;

	constructor() {
		this.logger = new ComponentLogger("SlackTransport");
	}

	async send(
		channel: AlertChannel,
		error: CriticalError,
		notification: AlertNotification,
	): Promise<void> {
		const config = channel.config as SlackConfig;

		if (config.webhookUrl) {
			await this.sendViaWebhook(config, error, notification);
		} else if (config.botToken) {
			await this.sendViaBotAPI(config, error, notification);
		} else {
			throw new Error(
				"Either webhookUrl or botToken must be provided for Slack transport",
			);
		}
	}

	private async sendViaWebhook(
		config: SlackConfig,
		error: CriticalError,
		notification: AlertNotification,
	): Promise<void> {
		const payload = this.buildWebhookPayload(config, error, notification);

		const response = await fetch(config.webhookUrl!, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Slack webhook error: ${response.status} - ${errorText}`);
		}

		this.logger.debug("Slack webhook sent successfully", {
			channel: config.channel,
			notificationId: notification.id,
		});
	}

	private async sendViaBotAPI(
		config: SlackConfig,
		error: CriticalError,
		notification: AlertNotification,
	): Promise<void> {
		const payload = this.buildAPIPayload(config, error, notification);

		const response = await fetch("https://slack.com/api/chat.postMessage", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${config.botToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		const result = await response.json();

		if (!result.ok) {
			throw new Error(`Slack API error: ${result.error}`);
		}

		this.logger.debug("Slack API message sent successfully", {
			channel: config.channel,
			messageTs: result.ts,
			notificationId: notification.id,
		});
	}

	private buildWebhookPayload(
		config: SlackConfig,
		error: CriticalError,
		notification: AlertNotification,
	) {
		const attachment = this.buildAttachment(error, notification);
		const mentions = this.buildMentions(config);

		return {
			channel: config.channel,
			username: config.username || "ClaudeFlow Alerts",
			icon_emoji: config.iconEmoji || ":rotating_light:",
			icon_url: config.iconUrl,
			text: mentions
				? `${mentions} Critical error detected!`
				: "Critical error detected!",
			attachments: [attachment],
		};
	}

	private buildAPIPayload(
		config: SlackConfig,
		error: CriticalError,
		notification: AlertNotification,
	) {
		const attachment = this.buildAttachment(error, notification);
		const mentions = this.buildMentions(config);

		return {
			channel: config.channel,
			username: config.username || "ClaudeFlow Alerts",
			icon_emoji: config.iconEmoji || ":rotating_light:",
			icon_url: config.iconUrl,
			text: mentions
				? `${mentions} Critical error detected!`
				: "Critical error detected!",
			attachments: [attachment],
			thread_ts: config.threadKey,
		};
	}

	private buildAttachment(
		error: CriticalError,
		notification: AlertNotification,
	): SlackAttachment {
		const severityColor = this.getSeverityColor(error.severity);
		const severityIcon = this.getSeverityIcon(error.severity);

		return {
			color: severityColor,
			title: `${severityIcon} ${error.type.replace(/_/g, " ").toUpperCase()}`,
			text: error.message,
			fields: [
				{
					title: "Environment",
					value: error.environment,
					short: true,
				},
				{
					title: "Severity",
					value: error.severity.toUpperCase(),
					short: true,
				},
				{
					title: "Source",
					value: error.source,
					short: true,
				},
				{
					title: "Timestamp",
					value: `<!date^${Math.floor(error.timestamp.getTime() / 1000)}^{date_short_pretty} at {time}|${error.timestamp.toISOString()}>`,
					short: true,
				},
				...(error.occurrenceCount > 1
					? [
							{
								title: "Occurrences",
								value: `${error.occurrenceCount} times`,
								short: true,
							},
						]
					: []),
				...(error.correlationId
					? [
							{
								title: "Correlation ID",
								value: `\`${error.correlationId}\``,
								short: true,
							},
						]
					: []),
			],
			footer: `Alert ID: ${error.id} | ClaudeFlow Alert System`,
			ts: Math.floor(error.timestamp.getTime() / 1000),
		};
	}

	private buildMentions(config: SlackConfig): string {
		const mentions: string[] = [];

		if (config.mentionChannel) {
			mentions.push("<!channel>");
		}

		if (config.mentionUsers && config.mentionUsers.length > 0) {
			mentions.push(...config.mentionUsers.map((user) => `<@${user}>`));
		}

		return mentions.join(" ");
	}

	private getSeverityColor(severity: string): string {
		switch (severity) {
			case "critical":
				return "danger";
			case "high":
				return "warning";
			case "medium":
				return "#ffeb3b";
			case "low":
				return "good";
			default:
				return "#9e9e9e";
		}
	}

	private getSeverityIcon(severity: string): string {
		switch (severity) {
			case "critical":
				return ":fire:";
			case "high":
				return ":warning:";
			case "medium":
				return ":exclamation:";
			case "low":
				return ":information_source:";
			default:
				return ":bell:";
		}
	}

	validateConfig(config: Record<string, any>): boolean {
		const slackConfig = config as SlackConfig;

		if (!slackConfig.channel) {
			return false;
		}

		if (!(slackConfig.webhookUrl || slackConfig.botToken)) {
			return false;
		}

		if (slackConfig.webhookUrl) {
			try {
				const url = new URL(slackConfig.webhookUrl);
				if (!url.hostname.includes("hooks.slack.com")) {
					return false;
				}
			} catch {
				return false;
			}
		}

		if (slackConfig.mentionUsers && !Array.isArray(slackConfig.mentionUsers)) {
			return false;
		}

		return true;
	}
}
