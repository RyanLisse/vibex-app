import type React from "react";

interface AmbientAgentsLayoutProps {
	children: React.ReactNode;
}

export default function AmbientAgentsLayout({ children }: AmbientAgentsLayoutProps) {
	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Ambient Agents</h1>
					<p className="text-gray-600">Manage and interact with your ambient AI agents</p>
				</div>
				<div className="bg-white rounded-lg shadow-sm border">{children}</div>
			</div>
		</div>
	);
}
