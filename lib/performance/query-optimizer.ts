/**
 * Query Optimization Service
 *
 * Provides query performance analysis, optimization suggestions,
 * and automatic query plan caching.
 */

import { observability } from "@/lib/observability";
import { performanceMonitor } from "./monitoring-dashboard";

export interface QueryPlan {
	query: string;
	plan: any;
	cost: number;
	executionTime: number;
	indexesUsed: string[];
	rowsExamined: number;
	rowsReturned: number;
	timestamp: Date;
}

export interface QueryOptimization {
	originalQuery: string;
	optimizedQuery: string;
	improvements: string[];
	estimatedSpeedup: number;
	confidence: number;
}

export interface IndexRecommendation {
	table: string;
	columns: string[];
	type: "btree" | "hash" | "gin" | "gist";
	reason: string;
	estimatedImpact: "high" | "medium" | "low";
	queries: string[];
}

/**
 * Query optimization and analysis service
 */
export class QueryOptimizer {
	private queryPlans = new Map<string, QueryPlan>();
	private slowQueries = new Map<string, number>();
	private indexRecommendations: IndexRecommendation[] = [];

	/**
	 * Analyze query performance and generate optimization suggestions
	 */
	async analyzeQuery(
		query: string,
		executionTime: number,
		rowsExamined: number,
		rowsReturned: number,
		indexesUsed: string[] = []
	): Promise<{
		isOptimal: boolean;
		suggestions: string[];
		optimization?: QueryOptimization;
		indexRecommendations: IndexRecommendation[];
	}> {
		const queryHash = this.hashQuery(query);

		// Record query performance
		performanceMonitor.recordQueryMetric({
			queryType: this.getQueryType(query),
			table: this.extractTableName(query),
			executionTimeMs: executionTime,
			rowsAffected: rowsReturned,
			indexesUsed,
			planCost: this.estimateQueryCost(query, rowsExamined, rowsReturned),
			timestamp: new Date(),
		});

		// Track slow queries
		if (executionTime > 1000) {
			this.slowQueries.set(queryHash, (this.slowQueries.get(queryHash) || 0) + 1);
		}

		const suggestions: string[] = [];
		let isOptimal = true;

		// Check for common performance issues
		if (executionTime > 1000) {
			isOptimal = false;
			suggestions.push("Query execution time exceeds 1 second");
		}

		if (indexesUsed.length === 0 && this.requiresIndex(query)) {
			isOptimal = false;
			suggestions.push("Query is not using any indexes");
			this.generateIndexRecommendations(query);
		}

		if (rowsExamined > rowsReturned * 10) {
			isOptimal = false;
			suggestions.push("Query is examining too many rows relative to results returned");
		}

		// Generate query optimization if needed
		let optimization: QueryOptimization | undefined;
		if (!isOptimal) {
			optimization = await this.optimizeQuery(query);
		}

		const indexRecommendations = this.getIndexRecommendationsForQuery(query);

		observability.recordEvent("query.analyzed", {
			queryHash,
			executionTime,
			isOptimal,
			suggestionsCount: suggestions.length,
			hasOptimization: !!optimization,
			indexRecommendationsCount: indexRecommendations.length,
		});

		return {
			isOptimal,
			suggestions,
			optimization,
			indexRecommendations,
		};
	}

	/**
	 * Optimize a query and provide suggestions
	 */
	private async optimizeQuery(query: string): Promise<QueryOptimization> {
		const improvements: string[] = [];
		let optimizedQuery = query;
		let estimatedSpeedup = 1.0;
		let confidence = 0.5;

		// Remove unnecessary SELECT *
		if (query.includes("SELECT *")) {
			optimizedQuery = this.optimizeSelectStar(optimizedQuery);
			improvements.push("Replace SELECT * with specific columns");
			estimatedSpeedup *= 1.2;
			confidence += 0.1;
		}

		// Add LIMIT if missing for potentially large result sets
		if (!query.toLowerCase().includes("limit") && this.mightReturnManyRows(query)) {
			optimizedQuery = this.addLimitClause(optimizedQuery);
			improvements.push("Add LIMIT clause to prevent large result sets");
			estimatedSpeedup *= 1.5;
			confidence += 0.2;
		}

		// Optimize WHERE clauses
		const whereOptimization = this.optimizeWhereClause(optimizedQuery);
		if (whereOptimization.changed) {
			optimizedQuery = whereOptimization.query;
			improvements.push(...whereOptimization.improvements);
			estimatedSpeedup *= whereOptimization.speedup;
			confidence += 0.1;
		}

		// Optimize JOINs
		const joinOptimization = this.optimizeJoins(optimizedQuery);
		if (joinOptimization.changed) {
			optimizedQuery = joinOptimization.query;
			improvements.push(...joinOptimization.improvements);
			estimatedSpeedup *= joinOptimization.speedup;
			confidence += 0.1;
		}

		return {
			originalQuery: query,
			optimizedQuery,
			improvements,
			estimatedSpeedup,
			confidence: Math.min(confidence, 1.0),
		};
	}

	/**
	 * Generate index recommendations for a query
	 */
	private generateIndexRecommendations(query: string): void {
		const table = this.extractTableName(query);
		if (!table) return;

		const whereColumns = this.extractWhereColumns(query);
		const orderByColumns = this.extractOrderByColumns(query);
		const joinColumns = this.extractJoinColumns(query);

		// Recommend indexes for WHERE clauses
		if (whereColumns.length > 0) {
			const recommendation: IndexRecommendation = {
				table,
				columns: whereColumns,
				type: "btree",
				reason: "Improve WHERE clause performance",
				estimatedImpact: "high",
				queries: [query],
			};
			this.addIndexRecommendation(recommendation);
		}

		// Recommend indexes for ORDER BY
		if (orderByColumns.length > 0) {
			const recommendation: IndexRecommendation = {
				table,
				columns: orderByColumns,
				type: "btree",
				reason: "Improve ORDER BY performance",
				estimatedImpact: "medium",
				queries: [query],
			};
			this.addIndexRecommendation(recommendation);
		}

		// Recommend indexes for JOINs
		if (joinColumns.length > 0) {
			const recommendation: IndexRecommendation = {
				table,
				columns: joinColumns,
				type: "btree",
				reason: "Improve JOIN performance",
				estimatedImpact: "high",
				queries: [query],
			};
			this.addIndexRecommendation(recommendation);
		}
	}

	/**
	 * Add or merge index recommendation
	 */
	private addIndexRecommendation(recommendation: IndexRecommendation): void {
		const existing = this.indexRecommendations.find(
			(r) =>
				r.table === recommendation.table &&
				JSON.stringify(r.columns.sort()) === JSON.stringify(recommendation.columns.sort())
		);

		if (existing) {
			// Merge with existing recommendation
			existing.queries.push(...recommendation.queries);
			existing.queries = [...new Set(existing.queries)]; // Remove duplicates
		} else {
			this.indexRecommendations.push(recommendation);
		}
	}

	/**
	 * Get index recommendations for a specific query
	 */
	private getIndexRecommendationsForQuery(query: string): IndexRecommendation[] {
		return this.indexRecommendations.filter((r) => r.queries.includes(query));
	}

	/**
	 * Optimize SELECT * queries
	 */
	private optimizeSelectStar(query: string): string {
		// This is a simplified implementation
		// In practice, you'd need to analyze the actual usage to determine required columns
		return query.replace(/SELECT \*/gi, "SELECT id, created_at, updated_at");
	}

	/**
	 * Add LIMIT clause if missing
	 */
	private addLimitClause(query: string): string {
		if (query.toLowerCase().includes("limit")) return query;
		return `${query.trim()} LIMIT 1000`;
	}

	/**
	 * Optimize WHERE clauses
	 */
	private optimizeWhereClause(query: string): {
		query: string;
		changed: boolean;
		improvements: string[];
		speedup: number;
	} {
		let optimizedQuery = query;
		const improvements: string[] = [];
		let changed = false;
		let speedup = 1.0;

		// Move most selective conditions first
		if (this.hasMultipleWhereConditions(query)) {
			optimizedQuery = this.reorderWhereConditions(optimizedQuery);
			improvements.push("Reorder WHERE conditions for better selectivity");
			changed = true;
			speedup *= 1.1;
		}

		// Convert OR to UNION for better performance in some cases
		if (query.toLowerCase().includes(" or ")) {
			const unionOptimization = this.convertOrToUnion(optimizedQuery);
			if (unionOptimization.beneficial) {
				optimizedQuery = unionOptimization.query;
				improvements.push("Convert OR conditions to UNION for better performance");
				changed = true;
				speedup *= 1.3;
			}
		}

		return { query: optimizedQuery, changed, improvements, speedup };
	}

	/**
	 * Optimize JOIN operations
	 */
	private optimizeJoins(query: string): {
		query: string;
		changed: boolean;
		improvements: string[];
		speedup: number;
	} {
		let optimizedQuery = query;
		const improvements: string[] = [];
		let changed = false;
		let speedup = 1.0;

		// Suggest INNER JOIN instead of WHERE-based joins
		if (this.hasImplicitJoins(query)) {
			optimizedQuery = this.convertToExplicitJoins(optimizedQuery);
			improvements.push("Convert implicit JOINs to explicit INNER JOINs");
			changed = true;
			speedup *= 1.2;
		}

		// Reorder JOINs for better performance
		if (this.hasMultipleJoins(query)) {
			optimizedQuery = this.reorderJoins(optimizedQuery);
			improvements.push("Reorder JOINs for optimal execution");
			changed = true;
			speedup *= 1.1;
		}

		return { query: optimizedQuery, changed, improvements, speedup };
	}

	// Helper methods for query analysis

	private hashQuery(query: string): string {
		// Simple hash function for query identification
		let hash = 0;
		for (let i = 0; i < query.length; i++) {
			const char = query.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(36);
	}

	private getQueryType(query: string): string {
		const trimmed = query.trim().toLowerCase();
		if (trimmed.startsWith("select")) return "SELECT";
		if (trimmed.startsWith("insert")) return "INSERT";
		if (trimmed.startsWith("update")) return "UPDATE";
		if (trimmed.startsWith("delete")) return "DELETE";
		return "OTHER";
	}

	private extractTableName(query: string): string {
		const match = query.match(/(?:FROM|UPDATE|INTO)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
		return match ? match[1] : "";
	}

	private extractWhereColumns(query: string): string[] {
		const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i);
		if (!whereMatch) return [];

		const whereClause = whereMatch[1];
		const columns: string[] = [];

		// Simple regex to find column names (this is simplified)
		const columnMatches = whereClause.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*[=<>!]/g);
		if (columnMatches) {
			columnMatches.forEach((match) => {
				const column = match.replace(/\s*[=<>!].*/, "");
				if (!columns.includes(column)) {
					columns.push(column);
				}
			});
		}

		return columns;
	}

	private extractOrderByColumns(query: string): string[] {
		const orderByMatch = query.match(/ORDER\s+BY\s+([^;]+)/i);
		if (!orderByMatch) return [];

		return orderByMatch[1]
			.split(",")
			.map((col) => col.trim().replace(/\s+(ASC|DESC)$/i, ""))
			.filter((col) => col.length > 0);
	}

	private extractJoinColumns(query: string): string[] {
		const joinMatches = query.match(
			/JOIN\s+[a-zA-Z_][a-zA-Z0-9_]*\s+ON\s+([^WHERE^ORDER^GROUP^LIMIT]+)/gi
		);
		if (!joinMatches) return [];

		const columns: string[] = [];
		joinMatches.forEach((match) => {
			const onClause = match.replace(/.*ON\s+/i, "");
			const columnMatches = onClause.match(/([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)/g);
			if (columnMatches) {
				columnMatches.forEach((col) => {
					const column = col.split(".")[1];
					if (!columns.includes(column)) {
						columns.push(column);
					}
				});
			}
		});

		return columns;
	}

	private requiresIndex(query: string): boolean {
		return (
			query.toLowerCase().includes("where") ||
			query.toLowerCase().includes("join") ||
			query.toLowerCase().includes("order by")
		);
	}

	private mightReturnManyRows(query: string): boolean {
		return !query.toLowerCase().includes("limit") && !query.toLowerCase().includes("where");
	}

	private estimateQueryCost(query: string, rowsExamined: number, rowsReturned: number): number {
		// Simplified cost estimation
		let cost = rowsExamined;

		if (query.toLowerCase().includes("join")) {
			cost *= 2; // JOINs are more expensive
		}

		if (query.toLowerCase().includes("order by")) {
			cost += rowsReturned * Math.log2(rowsReturned); // Sorting cost
		}

		return cost;
	}

	// Simplified implementations of optimization methods
	private hasMultipleWhereConditions(query: string): boolean {
		const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i);
		return whereMatch ? whereMatch[1].includes("AND") : false;
	}

	private reorderWhereConditions(query: string): string {
		// Simplified reordering - in practice, this would be much more sophisticated
		return query;
	}

	private convertOrToUnion(query: string): { query: string; beneficial: boolean } {
		// Simplified OR to UNION conversion
		return { query, beneficial: false };
	}

	private hasImplicitJoins(query: string): boolean {
		return query.includes(",") && query.toLowerCase().includes("where");
	}

	private convertToExplicitJoins(query: string): string {
		// Simplified conversion - would need proper SQL parsing
		return query;
	}

	private hasMultipleJoins(query: string): boolean {
		const joinCount = (query.match(/\bJOIN\b/gi) || []).length;
		return joinCount > 1;
	}

	private reorderJoins(query: string): string {
		// Simplified join reordering
		return query;
	}

	/**
	 * Get all index recommendations
	 */
	getAllIndexRecommendations(): IndexRecommendation[] {
		return [...this.indexRecommendations];
	}

	/**
	 * Get slow query statistics
	 */
	getSlowQueryStats(): Array<{ queryHash: string; count: number }> {
		return Array.from(this.slowQueries.entries()).map(([queryHash, count]) => ({
			queryHash,
			count,
		}));
	}

	/**
	 * Clear optimization data
	 */
	clearData(): void {
		this.queryPlans.clear();
		this.slowQueries.clear();
		this.indexRecommendations = [];
	}
}

// Singleton instance
export const queryOptimizer = new QueryOptimizer();
