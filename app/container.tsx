"use client";

import type React from "react";

interface ContainerProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * Main application container component
 * Provides consistent layout and styling for the application
 */
export default function Container({ children, className = "" }: ContainerProps) {
	return <div className={`container mx-auto px-4 py-6 ${className}`}>{children}</div>;
}
