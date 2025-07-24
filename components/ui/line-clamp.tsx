import * as React from "react";
import { cn } from "@/lib/utils";

export interface LineClampProps extends React.HTMLAttributes<HTMLDivElement> {
	lines?: number;
	children: React.ReactNode;
}

/**
 * A component that clamps text to a specified number of lines with CSS
 * Uses Tailwind's line-clamp utilities for clean text truncation
 */
export const LineClamp = React.forwardRef<HTMLDivElement, LineClampProps>(
	({ lines = 3, className, children, ...props }, ref) => {
		// Map lines to Tailwind classes
		const getLineClampClass = (lines: number) => {
			switch (lines) {
				case 1:
					return "line-clamp-1";
				case 2:
					return "line-clamp-2";
				case 3:
					return "line-clamp-3";
				case 4:
					return "line-clamp-4";
				case 5:
					return "line-clamp-5";
				case 6:
					return "line-clamp-6";
				default:
					// For custom line counts, use CSS custom properties
					return "line-clamp-none";
			}
		};

		const lineClampClass = getLineClampClass(lines);
		const customStyle =
			lines > 6
				? {
						display: "-webkit-box",
						WebkitLineClamp: lines,
						WebkitBoxOrient: "vertical" as const,
						overflow: "hidden",
					}
				: undefined;

		return (
			<div ref={ref} className={cn(lineClampClass, className)} style={customStyle} {...props}>
				{children}
			</div>
		);
	}
);

LineClamp.displayName = "LineClamp";

export default LineClamp;
