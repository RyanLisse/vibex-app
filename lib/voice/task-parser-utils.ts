/**
 * Voice Task Parsing Utilities
 *
 * Breaks down complex parseTaskFromTranscription function into
 * smaller, testable utilities to reduce complexity from 22 to under 15.
 */

// Priority detection patterns
const PRIORITY_PATTERNS = {
	high: /high.?priority|urgent|critical/i,
	low: /low.?priority|minor/i,
	medium: /medium.?priority|normal/i,
} as const;

// Label detection patterns
const LABEL_PATTERNS = {
	bug: /bug|fix|error|issue/i,
	feature: /feature|enhancement|new/i,
	frontend: /frontend|ui|interface/i,
	backend: /backend|api|server/i,
	testing: /testing|test|qa/i,
} as const;

// Regex patterns
const ASSIGNEE_PATTERN = /assign(?:ed)?\s+to\s+(\w+(?:\s+\w+)?)/i;
const DUE_DATE_PATTERN = /(?:due|deadline|by)\s+([a-zA-Z]+\s+\d{1,2}(?:,?\s+\d{4})?)/i;

export interface ParsedTaskData {
	title: string;
	description: string;
	priority: "high" | "medium" | "low";
	assignee?: string;
	dueDate?: string;
	labels: string[];
}

/**
 * Extract priority from text using pattern matching
 */
export function extractPriority(text: string): "high" | "medium" | "low" {
	if (PRIORITY_PATTERNS.high.test(text)) {
		return "high";
	}
	if (PRIORITY_PATTERNS.low.test(text)) {
		return "low";
	}
	return "medium";
}

/**
 * Extract assignee from text using regex
 */
export function extractAssignee(text: string): string | undefined {
	const match = text.match(ASSIGNEE_PATTERN);
	return match ? match[1] : undefined;
}

/**
 * Extract due date from text using regex
 */
export function extractDueDate(text: string): string | undefined {
	const match = text.match(DUE_DATE_PATTERN);
	return match ? match[1] : undefined;
}

/**
 * Extract labels from text using pattern matching
 */
export function extractLabels(text: string): string[] {
	const labels: string[] = [];

	for (const [label, pattern] of Object.entries(LABEL_PATTERNS)) {
		if (pattern.test(text)) {
			labels.push(label);
		}
	}

	return labels.length > 0 ? labels : ["voice-created"];
}

/**
 * Generate task title from text
 */
export function generateTitle(text: string): string {
	const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
	return sentences[0]?.trim() || "Voice-created task";
}

/**
 * Parse transcribed text to extract task details
 * Refactored from complex 22-complexity function to simple orchestrator (complexity ~5)
 */
export function parseTaskFromTranscription(text: string): ParsedTaskData {
	return {
		title: generateTitle(text),
		description: text,
		priority: extractPriority(text),
		assignee: extractAssignee(text),
		dueDate: extractDueDate(text),
		labels: extractLabels(text),
	};
}
