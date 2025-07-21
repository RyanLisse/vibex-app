// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest } from "next/server";
import { z } from "zod";
import { getMultiAgentSystem } from "@/lib/letta/multi-agent-system";
import {
	createApiResponse,
	createErrorResponse,
} from "@/lib/api/error-handler";
import { handleApiError } from "@/lib/api/error-handler";
import { getLogger } from "@/lib/logging/safe-wrapper";

const VoiceMessageSchema = z.object({
	sessionId: z.string(),
});

// POST /api/agents/voice - Process voice message
export async function POST(request: NextRequest) {
	const logger = getLogger("api-agents-voice");

	try {
		const formData = await request.formData();
		const sessionId = formData.get("sessionId") as string;
		const audioFile = formData.get("audio") as File;

		if (!(sessionId && audioFile)) {
			return createErrorResponse("Missing sessionId or audio file", 400);
		}

		// Validate sessionId
		VoiceMessageSchema.parse({ sessionId });

		// Convert audio file to ArrayBuffer
		const audioBuffer = await audioFile.arrayBuffer();

		const system = getMultiAgentSystem();
		const response = await system.processVoiceMessage(sessionId, audioBuffer);

		// Convert audio response back to base64 for JSON transport
		const audioBase64 = Buffer.from(response.audioResponse).toString("base64");

		return createApiResponse({
			audioResponse: audioBase64,
			textResponse: response.textResponse,
		});
	} catch (error) {
		return handleApiError(error, {
			logger,
			operation: "process voice message",
		});
	}
}

// GET /api/agents/voice - Get voice capabilities
export async function GET() {
	const logger = getLogger("api-agents-voice");

	try {
		const system = getMultiAgentSystem();
		const status = system.getSystemStatus();

		return createApiResponse({
			voiceEnabled: status.config.enableVoice,
			supportedFormats: ["wav", "mp3", "ogg"],
			maxFileSize: "10MB",
			sampleRate: "16000Hz",
		});
	} catch (error) {
		return handleApiError(error, {
			logger,
			operation: "get voice capabilities",
		});
	}
}
