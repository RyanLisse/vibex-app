/**
 * Metadata enricher for logging
 */

export interface Metadata {
	[key: string]: any;
}

export class MetadataEnricher {
	private globalMetadata: Metadata = {};
	private enrichers: Array<(meta: Metadata) => Metadata> = [];

	constructor(initialMetadata?: Metadata) {
		if (initialMetadata) {
			this.globalMetadata = { ...initialMetadata };
		}
	}

	/**
	 * Add global metadata that will be included in all logs
	 */
	addGlobalMetadata(metadata: Metadata): void {
		this.globalMetadata = {
			...this.globalMetadata,
			...metadata,
		};
	}

	/**
	 * Remove a global metadata key
	 */
	removeGlobalMetadata(key: string): void {
		delete this.globalMetadata[key];
	}

	/**
	 * Add a custom enricher function
	 */
	addEnricher(enricher: (meta: Metadata) => Metadata): void {
		this.enrichers.push(enricher);
	}

	/**
	 * Enrich metadata with global metadata and custom enrichers
	 */
	enrich(metadata: Metadata = {}): Metadata {
		let enriched = {
			...this.globalMetadata,
			...metadata,
			timestamp: new Date().toISOString(),
		};

		// Apply custom enrichers
		for (const enricher of this.enrichers) {
			enriched = enricher(enriched);
		}

		return enriched;
	}

	/**
	 * Get current global metadata
	 */
	getGlobalMetadata(): Metadata {
		return { ...this.globalMetadata };
	}

	/**
	 * Clear all metadata and enrichers
	 */
	clear(): void {
		this.globalMetadata = {};
		this.enrichers = [];
	}
}
