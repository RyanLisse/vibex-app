/**
 * Enhanced Observability Demo Page
 *
 * Demonstrates the comprehensive observability system with real-time monitoring,
 * agent execution tracking, and performance metrics.
 */

import { ObservabilityDashboard } from "@/components/observability/ObservabilityDashboard";

export default function ObservabilityPage() {
	return (
		<div className="container mx-auto py-8">
			<ObservabilityDashboard />
		</div>
	);
}
