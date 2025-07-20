"use server";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { cookies } from "next/headers";
import { getInngestApp, inngest, taskChannel } from "@/lib/inngest";
import { getLogger } from "@/lib/logging/safe-wrapper";
import { getTelemetryConfig } from "@/lib/telemetry";
import type { Task } from "@/types/task";

const logger = getLogger("inngest-actions");

export type TaskChannelToken = Realtime.Token<
	typeof taskChannel,
	["status", "update", "control"]
>;
export type TaskChannelTokenResponse = TaskChannelToken | null;

export const createTaskAction = async ({
	task,
	sessionId,
	prompt,
}: {
	task: Task;
	sessionId?: string;
	prompt?: string;
}) => {
	const cookieStore = await cookies();
	const githubToken = cookieStore.get("github_access_token")?.value;

	if (!githubToken) {
		throw new Error("No GitHub token found. Please authenticate first.");
	}

	const telemetryConfig = getTelemetryConfig();

	await inngest.send({
		name: "clonedex/create.task",
		data: {
			task,
			token: githubToken,
			sessionId,
			prompt,
			telemetryConfig: telemetryConfig.isEnabled ? telemetryConfig : undefined,
		},
	});
};

export const createPullRequestAction = async ({
	sessionId,
}: {
	sessionId?: string;
}) => {
	const cookieStore = await cookies();
	const githubToken = cookieStore.get("github_access_token")?.value;

	if (!githubToken) {
		throw new Error("No GitHub token found. Please authenticate first.");
	}

	const telemetryConfig = getTelemetryConfig();

	await inngest.send({
		name: "clonedex/create.pull-request",
		data: {
			token: githubToken,
			sessionId,
			telemetryConfig: telemetryConfig.isEnabled ? telemetryConfig : undefined,
		},
	});
};

export async function pauseTaskAction(taskId: string) {
	await inngest.send({
		name: "clonedx/task.control",
		data: {
			taskId,
			action: "pause",
		},
	});
}

export async function resumeTaskAction(taskId: string) {
	await inngest.send({
		name: "clonedx/task.control",
		data: {
			taskId,
			action: "resume",
		},
	});
}

export async function cancelTaskAction(taskId: string) {
	await inngest.send({
		name: "clonedx/task.control",
		data: {
			taskId,
			action: "cancel",
		},
	});
}

// Helper functions for validation
const validateInngestConfig = (): boolean => {
	const { INNGEST_SIGNING_KEY, INNGEST_EVENT_KEY, NODE_ENV, INNGEST_DEV } =
		process.env;

	// In development mode with INNGEST_DEV=1, we don't need valid keys
	if (NODE_ENV === "development" || INNGEST_DEV === "1") {
		return true;
	}

	if (!(INNGEST_SIGNING_KEY && INNGEST_EVENT_KEY)) {
		return false;
	}

	if (
		!INNGEST_SIGNING_KEY.startsWith("signkey-") ||
		INNGEST_EVENT_KEY.length < 50
	) {
		return false;
	}

	return true;
};

const validateToken = (token: unknown): token is TaskChannelToken => {
	if (!token) {
		return false;
	}

	if (typeof token !== "string" && !(token as { token?: string })?.token) {
		return false;
	}

	return true;
};

const handleTokenError = (error: unknown): void => {
	if (error instanceof Error) {
		if (error.message.includes("401") || error.message.includes("403")) {
			// Authentication error - user needs to re-authenticate
			logger.warn("Authentication error", { error: error.message });
		} else if (
			error.message.includes("network") ||
			error.message.includes("fetch")
		) {
			// Network error - connection issues
			logger.warn("Network error", { error: error.message });
		}
	}
};

export async function fetchRealtimeSubscriptionToken(): Promise<TaskChannelToken | null> {
	try {
		if (!validateInngestConfig()) {
			return null;
		}

		const token = await getSubscriptionToken(getInngestApp(), {
			channel: taskChannel(),
			topics: ["status", "update", "control"],
		});

		if (!validateToken(token)) {
			return null;
		}

		return token;
	} catch (error) {
		handleTokenError(error);
		return null;
	}
}
