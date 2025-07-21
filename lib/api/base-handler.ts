/**
 * Base API Handler
 *
 * Provides standardized request handling for all API routes
 * Includes validation, error handling, and response formatting
 */

import { z } from "zod";
	createApiErrorResponse,
	createApiSuccessResponse,
} from "@/src/schemas/api-routes";