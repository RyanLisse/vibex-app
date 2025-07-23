// Container type definitions and utility functions

export interface ContainerData {
	id: string;
	timestamp: number;
	version: string;
	data: any;
	metadata?: {
		source?: string;
		checksum?: string;
		lastUpdated?: number;
	};
}

export interface ContainerStatus {
	isLatest: boolean;
	version: string;
	lastChecked: number;
}

export interface StatusData {
	status: string;
	containerId: string;
	timestamp: string;
	exitCode?: number;
	error?: string | null;
}

export interface UpdateData {
	type: string;
	containerId: string;
	timestamp: string;
	data: any;
}

export interface LatestData {
	containerId: string;
	lastStatus: string;
	lastUpdate: string;
	version: string;
	metadata?: any;
	health?: string;
}

/**
 * Checks if the provided data is the latest version
 * @param data - Container data to check
 * @param comparison - Optional comparison data or version string
 * @returns true if data is latest, false otherwise
 */
export function isLatestData(
	data: ContainerData,
	comparison?: ContainerData | string,
): boolean {
	if (!data) {
		return false;
	}

	if (!comparison) {
		// If no comparison provided, assume data is latest if it has valid structure
		return !!(data.id && data.timestamp && data.version);
	}

	if (typeof comparison === "string") {
		// Compare against version string
		return data.version === comparison;
	}

	// Compare against another ContainerData object
	if (data.version !== comparison.version) {
		return data.timestamp >= comparison.timestamp;
	}

	// Same version, compare timestamps
	return data.timestamp >= comparison.timestamp;
}

/**
 * Creates container data with proper structure
 * @param id - Unique identifier for the container
 * @param data - The actual data to store
 * @param version - Version identifier
 * @returns Properly structured container data
 */
export function createContainerData(
	id: string,
	data: any,
	version: string = "1.0.0",
): ContainerData {
	return {
		id,
		timestamp: Date.now(),
		version,
		data,
		metadata: {
			source: "vibex-app",
			lastUpdated: Date.now(),
		},
	};
}

/**
 * Validates container data structure
 * @param data - Data to validate
 * @returns true if valid, throws error otherwise
 */
export function validateContainerData(data: ContainerData): boolean {
	if (!data) {
		throw new Error("Container data is required");
	}

	if (!data.id || typeof data.id !== "string") {
		throw new Error("Container data must have a valid id");
	}

	if (!data.timestamp || typeof data.timestamp !== "number") {
		throw new Error("Container data must have a valid timestamp");
	}

	if (!data.version || typeof data.version !== "string") {
		throw new Error("Container data must have a valid version");
	}

	return true;
}

/**
 * Compares two container data objects for version precedence
 * @param a - First container data
 * @param b - Second container data
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareContainerVersions(
	a: ContainerData,
	b: ContainerData,
): number {
	if (a.version === b.version) {
		return a.timestamp === b.timestamp ? 0 : a.timestamp > b.timestamp ? 1 : -1;
	}

	// Simple semantic version comparison (assumes semver format)
	const parseVersion = (version: string) => {
		return version.split(".").map(Number);
	};

	const vA = parseVersion(a.version);
	const vB = parseVersion(b.version);

	for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
		const numA = vA[i] || 0;
		const numB = vB[i] || 0;

		if (numA !== numB) {
			return numA > numB ? 1 : -1;
		}
	}

	return 0;
}

/**
 * Type guard to check if data is StatusData
 */
export function isStatusData(data: any): data is StatusData {
	return (
		data != null &&
		typeof data === "object" &&
		typeof data.status === "string" &&
		typeof data.containerId === "string" &&
		typeof data.timestamp === "string"
	);
}

/**
 * Type guard to check if data is UpdateData
 */
export function isUpdateData(data: any): data is UpdateData {
	return (
		data != null &&
		typeof data === "object" &&
		typeof data.type === "string" &&
		typeof data.containerId === "string" &&
		typeof data.timestamp === "string" &&
		data.data !== undefined
	);
}

/**
 * Type guard to check if data is LatestData
 */
export function isLatestDataType(data: any): data is LatestData {
	return (
		data != null &&
		typeof data === "object" &&
		typeof data.containerId === "string" &&
		typeof data.lastStatus === "string" &&
		typeof data.lastUpdate === "string" &&
		typeof data.version === "string"
	);
}
