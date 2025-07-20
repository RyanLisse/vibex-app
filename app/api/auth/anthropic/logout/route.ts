// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Auth } from "@/lib/auth/index";

export async function POST() {
	try {
		await Auth.remove("anthropic");

		return NextResponse.json({ success: true });
	} catch (_error) {
		return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
	}
}
