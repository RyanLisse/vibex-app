// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Screenshot Bug Reporting API Route
 *
 * Handles screenshot uploads and bug report creation with annotation data.
 */

import { observability } from "@/lib/observability";
import {
	createApiErrorResponse,
	createApiSuccessResponse,
} from "@/src/schemas/api-routes";
