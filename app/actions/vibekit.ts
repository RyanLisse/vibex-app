"use server";

import { VibeKit, type VibeKitConfig } from "@vibe-kit/sdk";
import { cookies } from "next/headers";
import { getTelemetryConfig } from "@/lib/telemetry";
import type { Task } from "@/types/task";

export const createPullRequestAction = async ({ task }: { task: Task }) => {
	const cookieStore = await cookies();
	const githubToken = cookieStore.get("github_access_token")?.value;

	if (!githubToken) {
		throw new Error("No GitHub token found. Please authenticate first.");
	}

	const telemetryConfig = getTelemetryConfig();

	const openaiApiKey = process.env.OPENAI_API_KEY;
	const e2bApiKey = process.env.E2B_API_KEY;

	if (!openaiApiKey) {
		throw new Error("OPENAI_API_KEY environment variable is required");
	}

	if (!e2bApiKey) {
		throw new Error("E2B_API_KEY environment variable is required");
	}

	const config: VibeKitConfig = {
		agent: {
			type: "codex",
			model: {
				apiKey: openaiApiKey,
			},
		},
		environment: {
			e2b: {
				apiKey: e2bApiKey,
			},
		},
		github: {
			token: githubToken,
			repository: task.repository,
		},
		sessionId: task.sessionId,
		telemetry: telemetryConfig.isEnabled ? telemetryConfig : undefined,
	};

	const vibekit = new VibeKit(config);

	const pr = await vibekit.createPullRequest();

	return pr;
};
