<<<<<<< HEAD
import type { AlertChannel, AlertNotification, CriticalError } from "../types";

export interface AlertTransport {
	send(
		channel: AlertChannel,
		error: CriticalError,
		notification: AlertNotification,
	): Promise<void>;
	validateConfig(config: Record<string, any>): boolean;
=======
import { AlertChannel, CriticalError, AlertNotification } from '../types'

export interface AlertTransport {
  send(channel: AlertChannel, error: CriticalError, notification: AlertNotification): Promise<void>
  validateConfig(config: Record<string, any>): boolean
>>>>>>> ryan-lisse/review-this-pr
}
