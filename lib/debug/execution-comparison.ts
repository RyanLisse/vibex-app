/**
 * Execution Comparison Utilities
 *
 * Tools for comparing execution states, finding differences,
 * and analyzing execution patterns across multiple runs.
 */

// Simple diff implementation since jsondiffpatch is not available
const diff = (left: any, right: any): any => {
	const changes: any = {};

	// Check all keys in left object
	for (const key in left) {
		if (!(key in right)) {
			changes[key] = [left[key], 0, 0]; // Removed
		} else if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) {
			if (typeof left[key] === "object" && typeof right[key] === "object") {
				const nestedDiff = diff(left[key], right[key]);
				if (Object.keys(nestedDiff).length > 0) {
					changes[key] = nestedDiff;
				}
			} else {
				changes[key] = [left[key], right[key]]; // Modified
			}
		}
	}

	// Check for added keys in right object
	for (const key in right) {
		if (!(key in left)) {
			changes[key] = [right[key]]; // Added
		}
	}

	return changes;
};
