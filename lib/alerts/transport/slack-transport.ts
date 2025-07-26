import type { CriticalError } from "../types";
import type { AlertChannel, AlertNotification, BaseTransport, SlackConfig } from "./types";
import { AlertChannelType } from "./types";

export class SlackTransport implements BaseTransport {
	name = "slack";
	type = AlertChannelType.SLACK;

	validateConfig(config: any): boolean {
		if (!config.webhookUrl || typeof config.webhookUrl !== "string") {
			return false;
		}

		// Basic URL validation
		try {
			new URL(config.webhookUrl);
		} catch {
			return false;
		}

		// Should be a Slack webhook URL
		if (!config.webhookUrl.includes("hooks.slack.com")) {
			return false;
		}

		return true;
	}

	async send(
		channel: AlertChannel,
		error: CriticalError,
		notification: AlertNotification
	): Promise<void> {
		const config = channel.config as SlackConfig;

		if (!this.validateConfig(config)) {
			throw new Error("Invalid Slack transport configuration");
		}

		const payload = this.buildSlackPayload(error, notification, channel, config);

		const response = await fetch(config.webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
		}
	}

	private buildSlackPayload(
		error: CriticalError,
		notification: AlertNotification,
		channel: AlertChannel,
		config: SlackConfig
	) {
		const severityColor =
			{
				low: "#36a64f",
				medium: "#ff9500",
				high: "#ff6b6b",
				critical: "#ff0000",
			}[error.severity] || "#808080";

		const attachment = {
			color: severityColor,
			title: `🚨 ${error.severity.toUpperCase()} Alert`,
			text: error.message,
			fields: [
				{
					title: "Alert ID",
					value: error.id,
					short: true,
				},
				{
					title: "Type",
					value: error.type,
					short: true,
				},
				{
					title: "Source",
					value: error.source,
					short: true,
				},
				{
					title: "Environment",
					value: error.environment,
					short: true,
				},
				{
					title: "Occurrences",
					value: error.occurrenceCount.toString(),
					short: true,
				},
				{
					title: "Priority",
					value: channel.priority,
					short: true,
				},
			],
			timestamp: Math.floor(error.timestamp.getTime() / 1000),
			footer: "ClaudeFlow Alert System",
		};

		return {
			username: config.username || "ClaudeFlow",
			icon_emoji: config.icon || ":warning:",
			channel: config.channel,
			text: `Alert from ${error.source}`,
			attachments: [attachment],
		};
	}
}
