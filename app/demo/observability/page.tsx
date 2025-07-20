import { ObservabilityDashboard } from "@/components/observability/observability-dashboard";

export const metadata = {
	title: "Database Observability Demo",
	description:
		"Interactive demo of the database observability features including time-travel debugging, agent memory browser, and workflow designer.",
};

export default function ObservabilityDemoPage() {
	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="mb-4 font-bold text-4xl">
						Database Observability Demo
					</h1>
					<p className="max-w-2xl text-lg text-muted-foreground">
						Explore our comprehensive database observability features including
						time-travel debugging, agent memory management, workflow
						orchestration, and real-time analytics.
					</p>
				</div>

				{/* Demo Dashboard */}
				<ObservabilityDashboard defaultTab="overview" />

				{/* Feature Highlights */}
				<div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
					<div className="rounded-lg border bg-card p-6">
						<h3 className="mb-3 font-semibold text-xl">
							🕰️ Time-Travel Debugging
						</h3>
						<p className="text-muted-foreground">
							Step through execution history, compare snapshots, and replay
							workflows with full state visibility for comprehensive debugging.
						</p>
					</div>

					<div className="rounded-lg border bg-card p-6">
						<h3 className="mb-3 font-semibold text-xl">
							🧠 Agent Memory Browser
						</h3>
						<p className="text-muted-foreground">
							Semantic search through agent memories, manage learned patterns,
							and track cross-agent knowledge sharing with vector embeddings.
						</p>
					</div>

					<div className="rounded-lg border bg-card p-6">
						<h3 className="mb-3 font-semibold text-xl">⚡ Workflow Designer</h3>
						<p className="text-muted-foreground">
							Visual workflow orchestration with drag-and-drop interface,
							real-time execution monitoring, and checkpoint recovery.
						</p>
					</div>
				</div>

				{/* Usage Instructions */}
				<div className="mt-12 rounded-lg bg-muted/50 p-6">
					<h2 className="mb-4 font-semibold text-2xl">How to Use This Demo</h2>
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<h3 className="mb-2 font-semibold">Getting Started</h3>
							<ul className="space-y-1 text-muted-foreground text-sm">
								<li>• Navigate between tabs to explore different features</li>
								<li>• Click on executions in the overview to debug them</li>
								<li>• Create and search agent memories in the Memory tab</li>
								<li>• Design workflows using the visual editor</li>
							</ul>
						</div>
						<div>
							<h3 className="mb-2 font-semibold">Key Features</h3>
							<ul className="space-y-1 text-muted-foreground text-sm">
								<li>• Real-time metrics and health monitoring</li>
								<li>• Interactive execution replay with speed controls</li>
								<li>• Semantic search across agent memories</li>
								<li>• Visual workflow design with React Flow</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
