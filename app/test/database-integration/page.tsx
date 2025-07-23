/**
 * Test page for database integration
 * Demonstrates TanStack Query + ElectricSQL integration
 */

import { TasksTestComponent } from "@/components/test/TasksTestComponent";

export default function DatabaseIntegrationTestPage() {
	return (
		<div className="min-h-screen bg-gray-50">
			<div className="py-8">
				<div className="max-w-4xl mx-auto px-4">
					<div className="text-center mb-8">
						<h1 className="text-3xl font-bold text-gray-900">
							Database Integration Test
						</h1>
						<p className="text-gray-600 mt-2">
							Testing TanStack Query + ElectricSQL + Database integration
						</p>
					</div>

					<TasksTestComponent />
				</div>
			</div>
		</div>
	);
}
