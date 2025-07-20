// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import type Redis from "ioredis";
import { type NextRequest, NextResponse } from "next/server";
import { AlertService } from "@/lib/alerts/alert-service";
import { getLogger } from "@/lib/logging";
import { getRedisConfig } from "@/lib/redis/config";
import { RedisClientManager } from "@/lib/redis/redis-client";

const logger = getLogger("AlertsChannelTestAPI");

function getAlertService(): AlertService {
	const redisConfig = getRedisConfig();
	const redisManager = RedisClientManager.getInstance(redisConfig);
	const redisClient = redisManager.getClient("primary");

	if (redisClient instanceof Cluster) {
		throw new Error("AlertService does not support Redis Cluster mode");
	}

	return new AlertService(redisClient as Redis);
}

const alertService = getAlertService();

export async function POST(
	_request: NextRequest,
	{ params }: { params: { name: string } },
) {
	try {
		await alertService.initialize();

		const channelName = params.name;

		if (!channelName) {
			return NextResponse.json(
				{
					success: false,
					error: "Channel name is required",
				},
				{ status: 400 },
			);
		}

		const success = await alertService.testChannel(channelName);

		if (success) {
			logger.info("Channel test successful", {
				channelName,
				endpoint: "/api/alerts/channels/[name]/test",
			});

			return NextResponse.json({
				success: true,
				message: `Test alert sent successfully to ${channelName}`,
				channelName,
				timestamp: new Date().toISOString(),
			});
		}
		logger.warn("Channel test failed", {
			channelName,
			endpoint: "/api/alerts/channels/[name]/test",
		});

		return NextResponse.json(
			{
				success: false,
				error: "Test alert failed to send",
				channelName,
			},
			{ status: 400 },
		);
	} catch (error) {
		logger.error("Channel test error", {
			channelName: params.name,
			error: error instanceof Error ? error.message : "Unknown error",
			endpoint: "/api/alerts/channels/[name]/test",
		});

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Channel test failed",
				channelName: params.name,
			},
			{ status: 500 },
		);
	}
}
