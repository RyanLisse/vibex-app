// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Real-time Progress Monitoring API Route
 *
 * Handles progress updates, milestone tracking, and real-time notifications.
 */

import { observability } from "@/lib/observability";
import {
	createApiErrorResponse,
	createApiSuccessResponse,
} from "@/src/schemas/api-routes";
