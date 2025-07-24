import type React from "react";

interface PageTemplateProps {
	title: string;
	description: string;
	children: React.ReactNode;
}

export default function PageTemplate({ title, description, children }: PageTemplateProps) {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
				<p className="text-gray-600">{description}</p>
			</div>
			{children}
		</div>
	);
}
