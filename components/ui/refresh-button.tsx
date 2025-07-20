"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RefreshButtonProps {
	onClick: () => void;
	isFetching?: boolean;
	disabled?: boolean;
	size?: "default" | "sm" | "lg" | "icon";
	variant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";
	className?: string;
}

export function RefreshButton({
	onClick,
	isFetching = false,
	disabled = false,
	size = "sm",
	variant = "ghost",
	className = "",
}: RefreshButtonProps) {
	return (
		<Button
			className={className}
			disabled={disabled || isFetching}
			onClick={onClick}
			size={size}
			variant={variant}
		>
			<RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
		</Button>
	);
}
