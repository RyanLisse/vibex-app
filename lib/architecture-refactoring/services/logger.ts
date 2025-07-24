/**
 * Logger Service
 * Provides logging functionality for the analysis system
 */

import type { LoggerInterface } from "../types";

export class Logger implements LoggerInterface {
	private context: string;
	private enabled = true;

	constructor(context: string) {
		this.context = context;
	}

	debug(message: string, metadata?: Record<string, unknown>): void {
		if (!this.enabled) return;

		if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
			console.debug(`[${this.context}] ${message}`, metadata || "");
		}
	}

	info(message: string, metadata?: Record<string, unknown>): void {
		if (!this.enabled) return;

		console.info(`[${this.context}] ${message}`, metadata || "");
	}

	warn(message: string, metadata?: Record<string, unknown>): void {
		if (!this.enabled) return;

		console.warn(`[${this.context}] ${message}`, metadata || "");
	}

	error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
		if (!this.enabled) return;

		console.error(`[${this.context}] ${message}`, {
			error: error
				? {
						message: error.message,
						stack: error.stack,
						name: error.name,
					}
				: undefined,
			...metadata,
		});
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	child(context: string): Logger {
		return new Logger(`${this.context}:${context}`);
	}
}
