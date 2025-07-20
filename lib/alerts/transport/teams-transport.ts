import { ComponentLogger } from "../../logging/logger-factory";
import type { AlertChannel, AlertNotification, CriticalError } from "../types";
import type { AlertTransport } from "./alert-transport-service";

interface TeamsConfig {
	webhookUrl: string;
	mentionUsers?: string[];
	mentionChannel?: boolean;
}

interface TeamsCard {
	"@type": string;
	"@context": string;
	summary: string;
	themeColor: string;
	sections: Array<{
		activityTitle: string;
		activitySubtitle?: string;
		activityImage?: string;
		facts: Array<{
			name: string;
			value: string;
		}>;
		text?: string;
	}>;
	potentialAction?: Array<{
		"@type": string;
		name: string;
		targets: Array<{
			os: string;
			uri: string;
		}>;
	}>;
}

export class TeamsTransport implements AlertTransport {
	private readonly logger: ComponentLogger;

	constructor() {
		this.logger = new ComponentLogger("TeamsTransport");
	}

	async send(
		channel: AlertChannel,
		error: CriticalError,
		notification: AlertNotification,
	): Promise<void> {
		const config = channel.config as TeamsConfig;
		const payload = this.buildPayload(config, error, notification);

		let lastError: Error | null = null;
		const maxRetries = 3;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(config.webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"User-Agent": "ClaudeFlow-AlertSystem/1.0",
					},
					body: JSON.stringify(payload),
					signal: AbortSignal.timeout(30_000),
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(
						`Teams webhook error: ${response.status} - ${errorText}`,
					);
				}

				this.logger.debug("Teams webhook sent successfully", {
					webhookUrl: config.webhookUrl,
					status: response.status,
					attempt,
					notificationId: notification.id,
				});

				return;
			} catch (requestError) {
				lastError =
					requestError instanceof Error
						? requestError
						: new Error("Unknown error");

				this.logger.warn("Teams webhook attempt failed", {
					webhookUrl: config.webhookUrl,
					attempt,
					maxRetries,
					error: lastError.message,
					notificationId: notification.id,
				});

				if (attempt < maxRetries) {
					// Exponential backoff: 1s, 2s, 4s
					const delay = 2 ** (attempt - 1) * 1000;
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError || new Error("All Teams webhook attempts failed");
	}

	private buildPayload(
		config: TeamsConfig,
		error: CriticalError,
		notification: AlertNotification,
	): TeamsCard {
		const severityColor = this.getSeverityColor(error.severity);
		const severityIcon = this.getSeverityIcon(error.severity);
		const mentions = this.buildMentions(config);

		const summary = `${severityIcon} Critical Error: ${error.type.replace(/_/g, " ")}`;
		const subtitle = mentions ? `${mentions} - ${error.source}` : error.source;

		return {
			"@type": "MessageCard",
			"@context": "http://schema.org/extensions",
			summary,
			themeColor: severityColor,
			sections: [
				{
					activityTitle: summary,
					activitySubtitle: subtitle,
					activityImage:
						"https://cdn-icons-png.flaticon.com/64/1828/1828843.png", // Alert icon
					facts: [
						{
							name: "Environment",
							value: error.environment,
						},
						{
							name: "Severity",
							value: error.severity.toUpperCase(),
						},
						{
							name: "Source",
							value: error.source,
						},
						{
							name: "Timestamp",
							value: error.timestamp.toLocaleString(),
						},
						...(error.occurrenceCount > 1
							? [
									{
										name: "Occurrences",
										value: `${error.occurrenceCount} times`,
									},
								]
							: []),
						...(error.correlationId
							? [
									{
										name: "Correlation ID",
										value: error.correlationId,
									},
								]
							: []),
						{
							name: "Alert ID",
							value: error.id,
						},
					],
					text: error.message,
				},
			],
			potentialAction: [
				{
					"@type": "OpenUri",
					name: "View Alert Dashboard",
					targets: [
						{
							os: "default",
							uri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/alerts`,
						},
					],
				},
			],
		};
	}

	private buildMentions(config: TeamsConfig): string {
		const mentions: string[] = [];

		if (config.mentionChannel) {
			mentions.push("@channel");
		}

		if (config.mentionUsers && config.mentionUsers.length > 0) {
			mentions.push(...config.mentionUsers.map((user) => `@${user}`));
		}

		return mentions.join(" ");
	}

	private getSeverityColor(severity: string): string {
		switch (severity) {
			case "critical":
				return "FF0000"; // Red
			case "high":
				return "FF6600"; // Orange
			case "medium":
				return "FFCC00"; // Yellow
			case "low":
				return "00CCFF"; // Light Blue
			default:
				return "808080"; // Gray
		}
	}

	private getSeverityIcon(severity: string): string {
		switch (severity) {
			case "critical":
				return "🚨";
			case "high":
				return "⚠️";
			case "medium":
				return "📢";
			case "low":
				return "ℹ️";
			default:
				return "🔔";
		}
	}

	validateConfig(config: Record<string, any>): boolean {
		const teamsConfig = config as TeamsConfig;

		if (!teamsConfig.webhookUrl) {
			return false;
		}

		try {
			const url = new URL(teamsConfig.webhookUrl);
			if (
				!(
					url.hostname.includes("office.com") ||
					url.hostname.includes("outlook.com")
				)
			) {
				return false;
			}
		} catch {
			return false;
		}

		if (teamsConfig.mentionUsers && !Array.isArray(teamsConfig.mentionUsers)) {
			return false;
		}

		return true;
	}
}
