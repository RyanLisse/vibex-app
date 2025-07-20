import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
	title: "Ambient Agent Visualization | Claude Flow",
	description:
		"Real-time monitoring and management of AI agent workflows with interactive visualizations",
	keywords:
		"AI agents, visualization, monitoring, real-time, workflow management",
};

export default function AmbientAgentsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <div className="min-h-screen bg-gray-50">{children}</div>;
}
