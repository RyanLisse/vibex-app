"use client";

import type React from "react";

interface ClientPageProps {
	children?: React.ReactNode;
	className?: string;
}

export default function ClientPage({ children, className }: ClientPageProps) {
	return <div className={className}>{children}</div>;
}

export { ClientPage };
