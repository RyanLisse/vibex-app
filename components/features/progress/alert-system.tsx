"use client";

import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AlertItem {
	id: string;
	type: "info" | "warning" | "error" | "success";
	title: string;
	message: string;
	timestamp: Date;
}

interface AlertSystemProps {
	alerts: AlertItem[];
	onDismiss?: (alertId: string) => void;
}

export function AlertSystem({ alerts, onDismiss }: AlertSystemProps) {
	const getAlertIcon = (type: AlertItem["type"]) => {
		switch (type) {
			case "success":
				return <CheckCircle className="w-4 h-4" />;
			case "warning":
				return <AlertTriangle className="w-4 h-4" />;
			case "error":
				return <XCircle className="w-4 h-4" />;
			case "info":
			default:
				return <Info className="w-4 h-4" />;
		}
	};

	const getAlertVariant = (type: AlertItem["type"]) => {
		switch (type) {
			case "error":
				return "destructive";
			default:
				return "default";
		}
	};

	if (alerts.length === 0) {
		return null;
	}

	return (
		<div className="space-y-2">
			{alerts.map((alert) => (
				<Alert key={alert.id} variant={getAlertVariant(alert.type)}>
					{getAlertIcon(alert.type)}
					<AlertTitle className="flex items-center justify-between">
						{alert.title}
						{onDismiss && (
							<button
								onClick={() => onDismiss(alert.id)}
								className="text-sm opacity-70 hover:opacity-100"
							>
								×
							</button>
						)}
					</AlertTitle>
					<AlertDescription>
						{alert.message}
						<div className="text-xs opacity-70 mt-1">{alert.timestamp.toLocaleTimeString()}</div>
					</AlertDescription>
				</Alert>
			))}
		</div>
	);
}
