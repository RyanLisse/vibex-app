/**
 * Consolidated Page Component Test Utilities
 *
 * This module consolidates common React page component test patterns to eliminate
 * code duplication identified by qlty smells analysis.
 */

import { render, screen } from "@testing-library/react";
import React from "react";

// Common page component structure
export interface PageComponentProps {
	children?: React.ReactNode;
	className?: string;
}

/**
 * Standard page wrapper structure used across multiple pages
 */
export const PAGE_WRAPPER_STRUCTURE = {
	container: "container mx-auto px-4 py-8",
	headerWrapper: "mb-8",
	title: "text-3xl font-bold mb-4",
	description: "text-gray-600 mb-6",
	content: "space-y-6",
} as const;

/**
 * Creates a standardized page component test
 */
export function createPageComponentTest(
	Component: React.ComponentType,
	expectedTitle: string,
	expectedDescription: string
) {
	return () => {
		render(React.createElement(Component));

		// Check for standard page structure
		const container =
			screen.getByRole("main") || screen.getByText(expectedTitle).closest(".container");
		expect(container).toBeInTheDocument();

		// Check for title
		const title = screen.getByText(expectedTitle);
		expect(title).toBeInTheDocument();
		expect(title).toHaveClass("text-3xl", "font-bold");

		// Check for description
		const description = screen.getByText(expectedDescription);
		expect(description).toBeInTheDocument();
		expect(description).toHaveClass("text-gray-600");
	};
}

/**
 * Base page component template to reduce duplication
 */
export function BasePage({
	title,
	description,
	children,
	className = "",
}: {
	title: string;
	description: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`${PAGE_WRAPPER_STRUCTURE.container} ${className}`}>
			<div className={PAGE_WRAPPER_STRUCTURE.headerWrapper}>
				<h1 className={PAGE_WRAPPER_STRUCTURE.title}>{title}</h1>
				<p className={PAGE_WRAPPER_STRUCTURE.description}>{description}</p>
			</div>
			<div className={PAGE_WRAPPER_STRUCTURE.content}>{children}</div>
		</div>
	);
}

/**
 * Common test data for pages
 */
export const PAGE_TEST_DATA = {
	AI_AUDIO: {
		title: "AI Audio Processing",
		description: "Advanced audio processing capabilities with AI integration",
	},
	DEMO: {
		title: "Demo",
		description: "Interactive demonstration of platform capabilities",
	},
	OBSERVABILITY: {
		title: "Observability Dashboard",
		description: "Monitor and analyze system performance and metrics",
	},
} as const;
