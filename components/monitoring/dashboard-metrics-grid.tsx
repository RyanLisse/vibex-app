/**
 * Metrics grid component for monitoring dashboard
 * Extracted to reduce complexity in main dashboard component
 */

import { AlertTriangle, CheckCircle, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCard {
	title: string;
	value: string | number;
	change?: number;
	status: "good" | "warning" | "error";
	description: string;
}

interface DashboardMetricsGridProps {
	metrics: MetricCard[];
}

export function DashboardMetricsGrid({ metrics }: DashboardMetricsGridProps) {
	const getStatusIcon = (status: string) => {
		switch (status) {
			case "good":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "warning":
				return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
			case "error":
				return <AlertTriangle className="h-4 w-4 text-red-500" />;
			default:
				return <Clock className="h-4 w-4 text-gray-500" />;
		}
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{metrics.map((metric, index) => (
				<Card key={index}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
						{getStatusIcon(metric.status)}
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{metric.value}</div>
						{metric.change !== undefined && (
							<div className="flex items-center text-xs text-muted-foreground">
								{metric.change > 0 ? (
									<TrendingUp className="h-3 w-3 mr-1 text-red-500" />
								) : (
									<TrendingDown className="h-3 w-3 mr-1 text-green-500" />
								)}
								{Math.abs(metric.change)}% from last week
							</div>
						)}
						<p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
