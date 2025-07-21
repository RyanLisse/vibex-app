// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { z } from "zod";
import {
	createApiResponse,
	createBadRequestResponse,
	withApiHandler,
} from "@/lib/api/common-handlers";
