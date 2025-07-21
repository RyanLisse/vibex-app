import React from "react";

export default function ObservabilityDemoPage() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">
					Observability Demo
				</h1>
				<p className="text-gray-600">
					Demonstration of observability features including metrics, tracing,
					and logging
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<div className="bg-white rounded-lg shadow-sm border p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-3">Metrics</h2>
					<p className="text-gray-600 mb-4">
						View application metrics and performance indicators
					</p>
					<div className="bg-gray-50 rounded p-3">
						<p className="text-sm text-gray-500">
							Metrics dashboard coming soon...
						</p>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-sm border p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-3">Tracing</h2>
					<p className="text-gray-600 mb-4">
						Distributed tracing and request flow visualization
					</p>
					<div className="bg-gray-50 rounded p-3">
						<p className="text-sm text-gray-500">
							Tracing interface coming soon...
						</p>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-sm border p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-3">Logging</h2>
					<p className="text-gray-600 mb-4">
						Application logs and error tracking
					</p>
					<div className="bg-gray-50 rounded p-3">
						<p className="text-sm text-gray-500">Log viewer coming soon...</p>
					</div>
				</div>
			</div>
		</div>
	);
}
