import type { CriticalError } from "../types";

export interface AlertTransportConfig {
	type: string;
	enabled: boolean;
	config: Record<string, any>;
}

export class AlertTransportService {
	private transports: Map<string, any> = new Map();

	constructor(private config: AlertTransportConfig[]) {
		// TODO: Initialize transports based on config
	}

	async sendAlert(error: CriticalError): Promise<void> {
		// TODO: Implement alert sending logic
		console.log("Sending alert:", error);
	}

	addTransport(name: string, transport: any): void {
		this.transports.set(name, transport);
	}

	removeTransport(name: string): void {
		this.transports.delete(name);
	}
}
