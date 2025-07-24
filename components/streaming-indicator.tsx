import React from "react";
import { cn } from "@/lib/utils";

interface StreamingIndicatorProps {
	variant?: "dots" | "cursor" | "wave";
	className?: string;
	size?: "sm" | "md" | "lg";
}

export const StreamingIndicator = React.forwardRef<HTMLDivElement, StreamingIndicatorProps>(
	({ variant = "dots", className, size = "md", ...props }, ref) => {
		const sizeClasses = {
			sm: { gap: "gap-0.5", dotSize: "w-1 h-1" },
			md: { gap: "gap-1", dotSize: "w-1.5 h-1.5" },
			lg: { gap: "gap-1.5", dotSize: "w-2 h-2" },
		};

		if (variant === "cursor") {
			return (
				<span
					ref={ref}
					className={cn("inline-block w-0.5 h-4 bg-primary animate-pulse", className)}
					{...props}
				/>
			);
		}

		if (variant === "wave") {
			return (
				<div
					ref={ref}
					className={cn("flex items-center", sizeClasses[size].gap, className)}
					{...props}
				>
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							className={cn("bg-primary/70 rounded-full animate-bounce", sizeClasses[size].dotSize)}
							style={{
								animationDelay: `${i * 0.15}s`,
								animationDuration: "1s",
							}}
						/>
					))}
				</div>
			);
		}

		// Default dots variant
		return (
			<div
				ref={ref}
				className={cn("flex items-center", sizeClasses[size].gap, className)}
				{...props}
			>
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className={cn("bg-primary/60 rounded-full animate-pulse", sizeClasses[size].dotSize)}
						style={{
							animationDelay: `${i * 0.2}s`,
							animationDuration: "1.4s",
						}}
					/>
				))}
			</div>
		);
	}
);

StreamingIndicator.displayName = "StreamingIndicator";
