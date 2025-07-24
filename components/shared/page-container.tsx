import React from "react";

export interface PageContainerProps {
	title: string;
	description: string;
	children?: React.ReactNode;
}

/**
 * Shared page container component to eliminate duplicate page templates
 * Used across ai-audio, demo, observability, and other similar pages
 */
export function PageContainer({ title, description, children }: PageContainerProps) {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-4">{title}</h1>
				<p className="text-gray-600 mb-6">{description}</p>
			</div>
			{children}
		</div>
	);
}
