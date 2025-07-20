/**
 * Query Builder Infrastructure
 *
 * Provides a fluent interface for building database queries with
 * automatic pagination, filtering, and sorting support.
 */

import {
	and,
	asc,
	desc,
	eq,
	gte,
	like,
	lte,
	ne,
	or,
	type SQL,
} from "drizzle-orm";
import { db } from "@/db/config";

export interface QueryOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	filters?: Record<string, any>;
	search?: {
		fields: string[];
		query: string;
	};
}

export interface QueryResult<T> {
	items: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

/**
 * Fluent query builder for database operations
 */
export class QueryBuilder<T> {
	private table: any;
	private conditions: SQL[] = [];
	private orderByClause?: SQL;
	private limitValue?: number;
	private offsetValue?: number;
	private selectFields?: Record<string, any>;

	constructor(table: any) {
		this.table = table;
	}

	/**
	 * Add WHERE conditions
	 */
	where(column: any, value: any): this {
		this.conditions.push(eq(column, value));
		return this;
	}

	/**
	 * Add WHERE NOT conditions
	 */
	whereNot(column: any, value: any): this {
		this.conditions.push(ne(column, value));
		return this;
	}

	/**
	 * Add WHERE LIKE conditions
	 */
	whereLike(column: any, pattern: string): this {
		this.conditions.push(like(column, pattern));
		return this;
	}

	/**
	 * Add WHERE >= conditions
	 */
	whereGte(column: any, value: any): this {
		this.conditions.push(gte(column, value));
		return this;
	}

	/**
	 * Add WHERE <= conditions
	 */
	whereLte(column: any, value: any): this {
		this.conditions.push(lte(column, value));
		return this;
	}

	/**
	 * Add search conditions across multiple fields
	 */
	search(fields: any[], query: string): this {
		if (!query) return this;

		const searchConditions = fields.map((field) => like(field, `%${query}%`));

		this.conditions.push(or(...searchConditions)!);
		return this;
	}

	/**
	 * Apply filters from a filter object
	 */
	filter(filters: Record<string, any>): this {
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				// Skip if the table doesn't have this column
				if (this.table[key]) {
					this.conditions.push(eq(this.table[key], value));
				}
			}
		});
		return this;
	}

	/**
	 * Set ORDER BY clause
	 */
	orderBy(column: any, direction: "asc" | "desc" = "desc"): this {
		this.orderByClause = direction === "asc" ? asc(column) : desc(column);
		return this;
	}

	/**
	 * Set LIMIT
	 */
	limit(value: number): this {
		this.limitValue = value;
		return this;
	}

	/**
	 * Set OFFSET
	 */
	offset(value: number): this {
		this.offsetValue = value;
		return this;
	}

	/**
	 * Specify fields to select
	 */
	select(fields: Record<string, any>): this {
		this.selectFields = fields;
		return this;
	}

	/**
	 * Apply pagination options
	 */
	paginate(page: number, limit: number): this {
		this.limitValue = limit;
		this.offsetValue = (page - 1) * limit;
		return this;
	}

	/**
	 * Apply query options
	 */
	applyOptions(options: QueryOptions): this {
		// Apply pagination
		if (options.page && options.limit) {
			this.paginate(options.page, options.limit);
		}

		// Apply sorting
		if (options.sortBy && this.table[options.sortBy]) {
			this.orderBy(this.table[options.sortBy], options.sortOrder || "desc");
		}

		// Apply filters
		if (options.filters) {
			this.filter(options.filters);
		}

		// Apply search
		if (options.search && options.search.query) {
			const searchFields = options.search.fields
				.map((field) => this.table[field])
				.filter(Boolean);

			if (searchFields.length > 0) {
				this.search(searchFields, options.search.query);
			}
		}

		return this;
	}

	/**
	 * Execute query and return results
	 */
	async execute(): Promise<T[]> {
		let query = this.selectFields
			? db.select(this.selectFields).from(this.table)
			: db.select().from(this.table);

		// Apply WHERE conditions
		if (this.conditions.length > 0) {
			query = query.where(and(...this.conditions));
		}

		// Apply ORDER BY
		if (this.orderByClause) {
			query = query.orderBy(this.orderByClause);
		}

		// Apply LIMIT
		if (this.limitValue) {
			query = query.limit(this.limitValue);
		}

		// Apply OFFSET
		if (this.offsetValue) {
			query = query.offset(this.offsetValue);
		}

		return await query;
	}

	/**
	 * Execute query with pagination metadata
	 */
	async executePaginated(): Promise<QueryResult<T>> {
		// Get total count
		const countQuery = db.select({ count: this.table.id }).from(this.table);

		if (this.conditions.length > 0) {
			countQuery.where(and(...this.conditions));
		}

		const countResult = await countQuery;
		const total = countResult.length;

		// Get paginated results
		const items = await this.execute();

		// Calculate pagination metadata
		const page =
			this.offsetValue && this.limitValue
				? Math.floor(this.offsetValue / this.limitValue) + 1
				: 1;
		const limit = this.limitValue || items.length;
		const totalPages = Math.ceil(total / limit);

		return {
			items,
			pagination: {
				page,
				limit,
				total,
				totalPages,
				hasNext: page < totalPages,
				hasPrev: page > 1,
			},
		};
	}

	/**
	 * Get first result
	 */
	async first(): Promise<T | null> {
		this.limit(1);
		const results = await this.execute();
		return results[0] || null;
	}

	/**
	 * Check if any results exist
	 */
	async exists(): Promise<boolean> {
		this.limit(1);
		const results = await this.execute();
		return results.length > 0;
	}

	/**
	 * Count results
	 */
	async count(): Promise<number> {
		const countQuery = db.select({ count: this.table.id }).from(this.table);

		if (this.conditions.length > 0) {
			countQuery.where(and(...this.conditions));
		}

		const result = await countQuery;
		return result.length;
	}
}

/**
 * Create a new query builder instance
 */
export function createQueryBuilder<T>(table: any): QueryBuilder<T> {
	return new QueryBuilder<T>(table);
}
