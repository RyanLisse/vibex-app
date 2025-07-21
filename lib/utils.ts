import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging CSS classes with Tailwind CSS support
 * Combines clsx for conditional classes and tailwind-merge for proper Tailwind deduplication
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
