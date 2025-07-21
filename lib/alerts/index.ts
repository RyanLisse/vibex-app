// Main exports for the alert system

export { AlertManager } from "./alert-manager";
export { AlertService } from "./alert-service";
export { AlertWinstonTransport } from "./alert-winston-transport";
export { CriticalErrorDetector } from "./critical-error-detector";
export { AlertTransportService } from "./transport/alert-transport-service";
export { EmailTransport } from "./transport/email-transport";
export { LogTransport } from "./transport/log-transport";
export { SlackTransport } from "./transport/slack-transport";
// Transport implementations
export { WebhookTransport } from "./transport/webhook-transport";

// Types
export type {
	AlertChannel,
	CriticalError,
} from "./types";

export {
	AlertChannelType,
	CriticalErrorType,
} from "./types";

// Helper to initialize alerts with existing logger
