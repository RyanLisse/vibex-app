
import { ComponentLogger } from "../../logging/logger-factory";
import type { AlertChannel, AlertNotification, CriticalError } from "../types";
import type { AlertTransport } from "./types";


interface WebhookConfig {
	url: string;
	method?: "POST" | "PUT";
	headers?: Record<string, string>;
	timeout?: number;
	retries?: number;
	authentication?: {
		type: "bearer" | "basic" | "api-key";
		token?: string;
		username?: string;
		password?: string;
		apiKey?: string;
		apiKeyHeader?: string;
	};
}

export class WebhookTransport implements AlertTransport {
	private readonly logger: ComponentLogger;

	constructor() {
		this.logger = new ComponentLogger("WebhookTransport");
	}

	async send(
		channel: AlertChannel,
		error: CriticalError,
		notification: AlertNotification,
	): Promise<void> {
		const config = channel.config as WebhookConfig;
		const payload = this.buildPayload(error, notification, channel);

		const requestInit: RequestInit = {
			method: config.method || "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "ClaudeFlow-AlertSystem/1.0",
				...config.headers,
			},
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(config.timeout || 30_000),
		};

		// Add authentication headers
		if (config.authentication) {
			this.addAuthenticationHeaders(requestInit, config.authentication);
		}

		let lastError: Error | null = null;
		const maxRetries = config.retries || 3;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const response = await fetch(config.url, requestInit);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				this.logger.debug("Webhook sent successfully", {
					url: config.url,
					status: response.status,
					attempt,
					notificationId: notification.id,
				});

				return;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error("Unknown error");

				this.logger.warn("Webhook attempt failed", {
					url: config.url,
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

		throw lastError || new Error("All webhook attempts failed");
	}

	private addAuthenticationHeaders(
		requestInit: RequestInit,
		auth: WebhookConfig["authentication"],
	): void {
		if (!(auth && requestInit.headers)) return;

		const headers = requestInit.headers as Record<string, string>;

		switch (auth.type) {
			case "bearer":
				if (auth.token) {
					headers["Authorization"] = `Bearer ${auth.token}`;
				}
				break;

			case "basic":
				if (auth.username && auth.password) {
					const credentials = btoa(`${auth.username}:${auth.password}`);
					headers["Authorization"] = `Basic ${credentials}`;
				}
				break;

			case "api-key":
				if (auth.apiKey && auth.apiKeyHeader) {
					headers[auth.apiKeyHeader] = auth.apiKey;
				}
				break;
		}
	}

	private buildPayload(
		error: CriticalError,
		notification: AlertNotification,
		channel: AlertChannel,
	) {
		return {
			alert: {
				id: error.id,
				timestamp: error.timestamp.toISOString(),
				type: error.type,
				severity: error.severity,
				message: error.message,
				source: error.source,
				environment: error.environment,
				resolved: error.resolved,
				occurrenceCount: error.occurrenceCount,
				metadata: error.metadata,
			},
			notification: {
				id: notification.id,
				channel: channel.name,
				priority: channel.priority,
			},
			system: {
				name: "ClaudeFlow",
				version: "1.0.0",
				timestamp: new Date().toISOString(),
			},
		};
	}

	validateConfig(config: Record<string, any>): boolean {
		const webhookConfig = config as WebhookConfig;

		if (!webhookConfig.url) {
			return false;
		}

		try {
			new URL(webhookConfig.url);
		} catch {
			return false;
		}

		if (
			webhookConfig.method &&
			!["POST", "PUT"].includes(webhookConfig.method)
		) {
			return false;
		}

		if (
			webhookConfig.timeout &&
			(webhookConfig.timeout < 1000 || webhookConfig.timeout > 60_000)
		) {
			return false;
		}

		if (webhookConfig.authentication) {
			const auth = webhookConfig.authentication;
			if (!["bearer", "basic", "api-key"].includes(auth.type)) {
				return false;
			}

			switch (auth.type) {
				case "bearer":
					if (!auth.token) return false;
					break;
				case "basic":
					if (!(auth.username && auth.password)) return false;
					break;
				case "api-key":
					if (!(auth.apiKey && auth.apiKeyHeader)) return false;
					break;
			}
		}

		return true;
	}
}
