// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Voice Task Creation API Route
 *
 * Handles voice recording uploads, transcription, and task creation from voice input.
 */

import { observability } from "@/lib/observability";
import {
	createApiErrorResponse,
	createApiSuccessResponse,
} from "@/src/schemas/api-routes";
