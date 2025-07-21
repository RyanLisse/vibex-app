// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Tasks API Route - Refactored Version
 *
 * Enhanced API route using base utilities for consistency and reduced duplication
 */

import { NotFoundError } from "@/lib/api/base-error";
