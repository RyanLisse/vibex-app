// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { type NextRequest, NextResponse } from "next/server";
import { getAlertService } from "@/lib/alerts";
import { CriticalErrorType } from "@/lib/alerts/types";
import { getLogger } from "@/lib/logging/safe-wrapper";

const logger = getLogger("alert-metrics-api");

export async function GET(_request: NextRequest) {
	try {
		const alertService = getAlertService();
		await alertService.initialize();

		const activeAlerts = await alertService.getActiveAlerts();
		const alertHistory = await alertService.getAlertHistory(1000);

		// Calculate metrics
		const now = new Date();
		const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		const last24HourAlerts = alertHistory.filter(
			(a) => new Date(a.timestamp) >= last24Hours,
		);
		const last7DayAlerts = alertHistory.filter(
			(a) => new Date(a.timestamp) >= last7Days,
		);

		// Group alerts by type
		const alertsByType: Record<CriticalErrorType, number> = {} as Record<
			CriticalErrorType,
			number
		>;
		for (const alert of alertHistory) {
			alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
		}

		// Group alerts by channel (this would need to be tracked during alert processing)
		const alertsByChannel: Record<string, number> = {};

		return NextResponse.json({
			success: true,
			data: {
				activeAlerts: activeAlerts.length,
				last24Hours: last24HourAlerts.length,
				last7Days: last7DayAlerts.length,
				alertsByType,
				alertsByChannel,
				recentAlerts: alertHistory.slice(0, 10),
			},
		});
	} catch (error) {
		logger.error("Failed to get alert metrics", error as Error);
		return NextResponse.json(
			{ success: false, error: "Failed to get alert metrics" },
			{ status: 500 },
		);
	}
}
