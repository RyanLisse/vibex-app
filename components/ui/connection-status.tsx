"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useElectricContext } from "@/components/providers/electric-provider";

interface ConnectionStatusProps {
	className?: string;
	showSyncIndicator?: boolean;
}

export function ConnectionStatus({
	className = "",
	showSyncIndicator = true,
}: ConnectionStatusProps) {
	const { isConnected, isSyncing } = useElectricContext();

	return (
		<div
			className={`flex items-center gap-2 text-muted-foreground text-sm ${className}`}
		>
			{isConnected ? (
				<>
					<Wifi className="h-4 w-4 text-green-500" />
					<span>Online</span>
					{showSyncIndicator && isSyncing && (
						<RefreshCw className="h-4 w-4 animate-spin" />
					)}
				</>
			) : (
				<>
					<WifiOff className="h-4 w-4 text-red-500" />
					<span>Offline</span>
				</>
			)}
		</div>
	);
}
