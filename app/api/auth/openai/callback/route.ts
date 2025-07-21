// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import {
	exchangeCodeForToken,
	handleAuthError,
	sanitizeRedirectUrl,
	validateOAuthState,
} from "@/lib/auth/openai-codex";
