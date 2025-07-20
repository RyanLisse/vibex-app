import { and, asc, desc, eq, gte, like, lte, ne, or } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/config";
import {
	createQueryBuilder,
	QueryBuilder,
	type QueryOptions,
} from "@/lib/api/base/query-builder";

// Mock the database
vi.mock("@/db/config", () => ({
	db: {
		select: vi.fn(),
	},
}));

// Mock table schema
const mockTable = {
	id: "mock.id",
	name: "mock.name",
	email: "mock.email",
	status: "mock.status",
	createdAt: "mock.createdAt",
	updatedAt: "mock.updatedAt",
	age: "mock.age",
	description: "mock.description",
};

// Mock query chain
class MockQueryChain {
	private selectFields: any;
	private fromTable: any;
	private whereClause: any;
	private orderByClause: any;
	private limitValue: any;
	private offsetValue: any;
	private results: any[] = [];

	constructor(results: any[] = []) {
		this.results = results;
	}

	select(fields?: any) {
		this.selectFields = fields;
		return this;
	}

	from(table: any) {
		this.fromTable = table;
		return this;
	}

	where(condition: any) {
		this.whereClause = condition;
		return this;
	}

	orderBy(order: any) {
		this.orderByClause = order;
		return this;
	}

	limit(value: number) {
		this.limitValue = value;
		return this;
	}

	offset(value: number) {
		this.offsetValue = value;
		return this;
	}

	async then(resolve: (value: any[]) => void) {
		resolve(this.results);
	}

	// For testing - expose internal state
	getState() {
		return {
			selectFields: this.selectFields,
			fromTable: this.fromTable,
			whereClause: this.whereClause,
			orderByClause: this.orderByClause,
			limitValue: this.limitValue,
			offsetValue: this.offsetValue,
		};
	}
}

describe("QueryBuilder Integration Tests", () => {
	let queryBuilder: QueryBuilder<any>;
	let mockQueryChain: MockQueryChain;

	beforeEach(() => {
		vi.clearAllMocks();
		queryBuilder = new QueryBuilder(mockTable);
		mockQueryChain = new MockQueryChain();

		// Setup db.select mock
		vi.mocked(db.select).mockImplementation((fields?: any) => {
			mockQueryChain.select(fields);
			return mockQueryChain as any;
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Basic query building", () => {
		it("should create a basic select query", async () => {
			const results = await queryBuilder.execute();

			expect(db.select).toHaveBeenCalledWith();
			expect(results).toEqual([]);
		});

		it("should select specific fields", async () => {
			const fields = { id: mockTable.id, name: mockTable.name };
			await queryBuilder.select(fields).execute();

			expect(db.select).toHaveBeenCalledWith(fields);
		});
	});

	describe("WHERE conditions", () => {
		it("should add simple where condition", async () => {
			await queryBuilder.where(mockTable.status, "active").execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});

		it("should add multiple where conditions", async () => {
			await queryBuilder
				.where(mockTable.status, "active")
				.where(mockTable.age, 25)
				.execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});

		it("should add whereNot condition", async () => {
			await queryBuilder.whereNot(mockTable.status, "deleted").execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});

		it("should add whereLike condition", async () => {
			await queryBuilder.whereLike(mockTable.name, "%John%").execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});

		it("should add whereGte condition", async () => {
			await queryBuilder.whereGte(mockTable.age, 18).execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});

		it("should add whereLte condition", async () => {
			await queryBuilder.whereLte(mockTable.age, 65).execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});

		it("should combine multiple condition types", async () => {
			await queryBuilder
				.where(mockTable.status, "active")
				.whereNot(mockTable.email, null)
				.whereGte(mockTable.age, 18)
				.whereLte(mockTable.age, 65)
				.execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});
	});

	describe("Search functionality", () => {
		it("should search across multiple fields", async () => {
			await queryBuilder
				.search([mockTable.name, mockTable.email], "john")
				.execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});

		it("should handle empty search query", async () => {
			await queryBuilder
				.search([mockTable.name, mockTable.email], "")
				.execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeUndefined();
		});

		it("should combine search with other conditions", async () => {
			await queryBuilder
				.where(mockTable.status, "active")
				.search([mockTable.name, mockTable.description], "test")
				.execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});
	});

	describe("Filter functionality", () => {
		it("should apply filters from object", async () => {
			const filters = {
				status: "active",
				age: 25,
				name: "John",
			};

			await queryBuilder.filter(filters).execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});

		it("should skip undefined and null values", async () => {
			const filters = {
				status: "active",
				age: undefined,
				name: null,
				email: "test@example.com",
			};

			await queryBuilder.filter(filters).execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});

		it("should skip non-existent columns", async () => {
			const filters = {
				status: "active",
				nonExistentField: "value",
			};

			await queryBuilder.filter(filters).execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});
	});

	describe("Sorting", () => {
		it("should order by column descending", async () => {
			await queryBuilder.orderBy(mockTable.createdAt, "desc").execute();

			const state = mockQueryChain.getState();
			expect(state.orderByClause).toBeDefined();
		});

		it("should order by column ascending", async () => {
			await queryBuilder.orderBy(mockTable.name, "asc").execute();

			const state = mockQueryChain.getState();
			expect(state.orderByClause).toBeDefined();
		});

		it("should default to descending order", async () => {
			await queryBuilder.orderBy(mockTable.updatedAt).execute();

			const state = mockQueryChain.getState();
			expect(state.orderByClause).toBeDefined();
		});
	});

	describe("Pagination", () => {
		it("should set limit", async () => {
			await queryBuilder.limit(10).execute();

			const state = mockQueryChain.getState();
			expect(state.limitValue).toBe(10);
		});

		it("should set offset", async () => {
			await queryBuilder.offset(20).execute();

			const state = mockQueryChain.getState();
			expect(state.offsetValue).toBe(20);
		});

		it("should paginate correctly", async () => {
			await queryBuilder.paginate(3, 10).execute();

			const state = mockQueryChain.getState();
			expect(state.limitValue).toBe(10);
			expect(state.offsetValue).toBe(20); // (3-1) * 10
		});

		it("should handle first page", async () => {
			await queryBuilder.paginate(1, 20).execute();

			const state = mockQueryChain.getState();
			expect(state.limitValue).toBe(20);
			expect(state.offsetValue).toBe(0);
		});
	});

	describe("Query options", () => {
		it("should apply all query options", async () => {
			const options: QueryOptions = {
				page: 2,
				limit: 15,
				sortBy: "createdAt",
				sortOrder: "asc",
				filters: {
					status: "active",
					age: 25,
				},
				search: {
					fields: ["name", "email"],
					query: "john",
				},
			};

			await queryBuilder.applyOptions(options).execute();

			const state = mockQueryChain.getState();
			expect(state.limitValue).toBe(15);
			expect(state.offsetValue).toBe(15); // (2-1) * 15
			expect(state.orderByClause).toBeDefined();
			expect(state.whereClause).toBeDefined();
		});

		it("should handle partial options", async () => {
			const options: QueryOptions = {
				page: 1,
				limit: 10,
				sortBy: "name",
			};

			await queryBuilder.applyOptions(options).execute();

			const state = mockQueryChain.getState();
			expect(state.limitValue).toBe(10);
			expect(state.offsetValue).toBe(0);
			expect(state.orderByClause).toBeDefined();
		});

		it("should skip invalid sort columns", async () => {
			const options: QueryOptions = {
				sortBy: "nonExistentColumn",
				sortOrder: "desc",
			};

			await queryBuilder.applyOptions(options).execute();

			const state = mockQueryChain.getState();
			expect(state.orderByClause).toBeUndefined();
		});

		it("should handle search with non-existent fields", async () => {
			const options: QueryOptions = {
				search: {
					fields: ["name", "nonExistent", "email"],
					query: "test",
				},
			};

			await queryBuilder.applyOptions(options).execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
		});
	});

	describe("Utility methods", () => {
		it("should get first result", async () => {
			const mockResults = [
				{ id: 1, name: "First" },
				{ id: 2, name: "Second" },
			];
			mockQueryChain = new MockQueryChain(mockResults);
			vi.mocked(db.select).mockImplementation(() => mockQueryChain as any);

			const result = await queryBuilder.first();

			expect(result).toEqual({ id: 1, name: "First" });
			const state = mockQueryChain.getState();
			expect(state.limitValue).toBe(1);
		});

		it("should return null when no first result", async () => {
			mockQueryChain = new MockQueryChain([]);
			vi.mocked(db.select).mockImplementation(() => mockQueryChain as any);

			const result = await queryBuilder.first();

			expect(result).toBeNull();
		});

		it("should check if results exist", async () => {
			mockQueryChain = new MockQueryChain([{ id: 1 }]);
			vi.mocked(db.select).mockImplementation(() => mockQueryChain as any);

			const exists = await queryBuilder.exists();

			expect(exists).toBe(true);
			const state = mockQueryChain.getState();
			expect(state.limitValue).toBe(1);
		});

		it("should return false when no results exist", async () => {
			mockQueryChain = new MockQueryChain([]);
			vi.mocked(db.select).mockImplementation(() => mockQueryChain as any);

			const exists = await queryBuilder.exists();

			expect(exists).toBe(false);
		});

		it("should count results", async () => {
			// Mock count results
			const countResults = Array(42).fill({ count: "mock.id" });
			mockQueryChain = new MockQueryChain(countResults);
			vi.mocked(db.select).mockImplementation(() => mockQueryChain as any);

			const count = await queryBuilder.count();

			expect(count).toBe(42);
		});

		it("should count with conditions", async () => {
			const countResults = Array(5).fill({ count: "mock.id" });
			mockQueryChain = new MockQueryChain(countResults);
			vi.mocked(db.select).mockImplementation(() => mockQueryChain as any);

			const count = await queryBuilder
				.where(mockTable.status, "active")
				.count();

			expect(count).toBe(5);
		});
	});

	describe("executePaginated", () => {
		it("should return paginated results with metadata", async () => {
			// Mock count query
			let callCount = 0;
			vi.mocked(db.select).mockImplementation((fields?: any) => {
				callCount++;
				if (callCount === 1) {
					// Count query
					const countResults = Array(25).fill({ count: "mock.id" });
					return new MockQueryChain(countResults) as any;
				}
				// Data query
				const dataResults = Array(10).fill({ id: 1, name: "Test" });
				return new MockQueryChain(dataResults) as any;
			});

			const result = await queryBuilder.paginate(2, 10).executePaginated();

			expect(result).toMatchObject({
				items: expect.arrayContaining([
					expect.objectContaining({ id: 1, name: "Test" }),
				]),
				pagination: {
					page: 2,
					limit: 10,
					total: 25,
					totalPages: 3,
					hasNext: true,
					hasPrev: true,
				},
			});
		});

		it("should handle first page pagination", async () => {
			let callCount = 0;
			vi.mocked(db.select).mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return new MockQueryChain(
						Array(15).fill({ count: "mock.id" }),
					) as any;
				}
				return new MockQueryChain(Array(10).fill({ id: 1 })) as any;
			});

			const result = await queryBuilder.paginate(1, 10).executePaginated();

			expect(result.pagination).toMatchObject({
				page: 1,
				hasNext: true,
				hasPrev: false,
			});
		});

		it("should handle last page pagination", async () => {
			let callCount = 0;
			vi.mocked(db.select).mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return new MockQueryChain(
						Array(25).fill({ count: "mock.id" }),
					) as any;
				}
				return new MockQueryChain(Array(5).fill({ id: 1 })) as any;
			});

			const result = await queryBuilder.paginate(3, 10).executePaginated();

			expect(result.pagination).toMatchObject({
				page: 3,
				totalPages: 3,
				hasNext: false,
				hasPrev: true,
			});
		});

		it("should handle empty results", async () => {
			vi.mocked(db.select).mockImplementation(
				() => new MockQueryChain([]) as any,
			);

			const result = await queryBuilder.paginate(1, 10).executePaginated();

			expect(result).toMatchObject({
				items: [],
				pagination: {
					page: 1,
					limit: 10,
					total: 0,
					totalPages: 0,
					hasNext: false,
					hasPrev: false,
				},
			});
		});

		it("should apply conditions to count query", async () => {
			let countQueryCalled = false;
			vi.mocked(db.select).mockImplementation((fields?: any) => {
				if (fields && "count" in fields) {
					countQueryCalled = true;
				}
				return new MockQueryChain([]) as any;
			});

			await queryBuilder
				.where(mockTable.status, "active")
				.filter({ age: 25 })
				.executePaginated();

			expect(countQueryCalled).toBe(true);
		});
	});

	describe("Method chaining", () => {
		it("should support complex method chaining", async () => {
			const result = await queryBuilder
				.select({ id: mockTable.id, name: mockTable.name })
				.where(mockTable.status, "active")
				.whereNot(mockTable.email, null)
				.whereGte(mockTable.age, 18)
				.whereLte(mockTable.age, 65)
				.search([mockTable.name, mockTable.description], "john")
				.filter({ createdAt: "2024-01-01" })
				.orderBy(mockTable.createdAt, "desc")
				.paginate(2, 20)
				.execute();

			const state = mockQueryChain.getState();
			expect(state.selectFields).toBeDefined();
			expect(state.whereClause).toBeDefined();
			expect(state.orderByClause).toBeDefined();
			expect(state.limitValue).toBe(20);
			expect(state.offsetValue).toBe(20);
		});

		it("should maintain fluent interface", () => {
			const chain = queryBuilder
				.where(mockTable.id, 1)
				.select({ id: mockTable.id })
				.orderBy(mockTable.name)
				.limit(10)
				.offset(0);

			expect(chain).toBe(queryBuilder);
		});
	});

	describe("createQueryBuilder factory", () => {
		it("should create new QueryBuilder instance", () => {
			const builder = createQueryBuilder(mockTable);

			expect(builder).toBeInstanceOf(QueryBuilder);
		});

		it("should create independent instances", () => {
			const builder1 = createQueryBuilder(mockTable);
			const builder2 = createQueryBuilder(mockTable);

			expect(builder1).not.toBe(builder2);
		});
	});

	describe("Real-world query scenarios", () => {
		it("should build user listing query", async () => {
			const userTable = {
				id: "users.id",
				email: "users.email",
				name: "users.name",
				role: "users.role",
				status: "users.status",
				createdAt: "users.createdAt",
			};

			const options: QueryOptions = {
				page: 1,
				limit: 25,
				sortBy: "createdAt",
				sortOrder: "desc",
				filters: {
					status: "active",
					role: "user",
				},
				search: {
					fields: ["name", "email"],
					query: "john",
				},
			};

			const builder = createQueryBuilder(userTable);
			await builder.applyOptions(options).execute();

			const state = mockQueryChain.getState();
			expect(state.limitValue).toBe(25);
			expect(state.offsetValue).toBe(0);
			expect(state.whereClause).toBeDefined();
			expect(state.orderByClause).toBeDefined();
		});

		it("should build filtered product query", async () => {
			const productTable = {
				id: "products.id",
				name: "products.name",
				price: "products.price",
				category: "products.category",
				inStock: "products.inStock",
			};

			const builder = createQueryBuilder(productTable);
			await builder
				.where(productTable.inStock, true)
				.whereGte(productTable.price, 10)
				.whereLte(productTable.price, 100)
				.filter({ category: "electronics" })
				.orderBy(productTable.price, "asc")
				.paginate(1, 20)
				.execute();

			const state = mockQueryChain.getState();
			expect(state.whereClause).toBeDefined();
			expect(state.orderByClause).toBeDefined();
			expect(state.limitValue).toBe(20);
		});
	});
});
