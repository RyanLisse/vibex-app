/**
 * Environments API Service
 *
 * Implements environment management operations with base infrastructure patterns
 * for consistent error handling, tracing, and observability.
 */

import { and, asc, desc, eq, like } from "drizzle-orm";
import { ulid } from "ulid";
import { z } from "zod";
import { db } from "@/db/config";
import { environments } from "@/db/schema";
import {
	BaseAPIService,
	BaseCRUDService,
	ConflictError,
	DatabaseError,
	NotFoundError,
	type ServiceContext,
} from "@/lib/api/base";
import { QueryBuilder } from "@/lib/api/base/query-builder";
import type { CreateEnvironmentSchema } from "@/src/schemas/api-routes";

// Query schemas
export const GetEnvironmentsQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	userId: z.string().optional(),
	isActive: z.coerce.boolean().optional(),
	search: z.string().optional(),
	sortBy: z.enum(["created_at", "updated_at", "name"]).default("created_at"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const ActivateEnvironmentSchema = z.object({
	environmentId: z.string().min(1),
	userId: z.string().min(1),
});

export type GetEnvironmentsQuery = z.infer<typeof GetEnvironmentsQuerySchema>;
export type CreateEnvironmentDTO = z.infer<typeof CreateEnvironmentSchema>;
export type ActivateEnvironmentDTO = z.infer<typeof ActivateEnvironmentSchema>;

export class EnvironmentsAPIService extends BaseCRUDService<
	any,
	CreateEnvironmentDTO,
	any
> {
	protected tableName = "environments";
	private queryBuilder = new QueryBuilder(environments);

	constructor() {
		super({ serviceName: "environments" });
	}

	/**
	 * Get all environments with filtering and pagination
	 */
	async getAll(
		params: GetEnvironmentsQuery,
		_pagination: { page: number; limit: number },
		context: ServiceContext,
	): Promise<{ items: any[]; total: number }> {
		return this.executeWithTracing("getEnvironments", context, async (span) => {
			// Build query with filters
			const query = this.queryBuilder;

			// Apply user filter
			if (params.userId) {
				query.where(environments.userId, params.userId);
			}

			// Apply active status filter
			if (params.isActive !== undefined) {
				query.where(environments.isActive, params.isActive);
			}

			// Apply search
			if (params.search) {
				query.whereLike(environments.name, `%${params.search}%`);
			}

			// Apply sorting
			let sortColumn;
			switch (params.sortBy) {
				case "name":
					sortColumn = environments.name;
					break;
				case "updated_at":
					sortColumn = environments.updatedAt;
					break;
				case "created_at":
				default:
					sortColumn = environments.createdAt;
			}
			query.orderBy(sortColumn, params.sortOrder);

			// Apply pagination
			query.paginate(params.page, params.limit);

			// Execute with pagination
			const result = await query.executePaginated();

			span.setAttributes({
				"environments.count": result.items.length,
				"environments.total": result.pagination.total,
				"environments.filters.userId": params.userId || "none",
				"environments.filters.search": params.search || "none",
			});

			await this.recordEvent(
				"query_end",
				"debug",
				"Environments query completed",
				{
					resultCount: result.items.length,
					totalCount: result.pagination.total,
					filters: params,
				},
			);

			return {
				items: result.items,
				total: result.pagination.total,
			};
		});
	}

	/**
	 * Get environment by ID
	 */
	async getById(id: string, context: ServiceContext): Promise<any> {
		return this.executeWithTracing(
			"getEnvironmentById",
			context,
			async (span) => {
				const environment = await this.executeDatabase(
					"selectEnvironment",
					async () => {
						const result = await db
							.select()
							.from(environments)
							.where(eq(environments.id, id))
							.limit(1);

						return result[0];
					},
				);

				if (!environment) {
					throw new NotFoundError("Environment", id);
				}

				span.setAttributes({
					"environment.id": environment.id,
					"environment.name": environment.name,
					"environment.userId": environment.userId,
				});

				return environment;
			},
		);
	}

	/**
	 * Create new environment
	 */
	async create(
		envData: CreateEnvironmentDTO,
		context: ServiceContext,
	): Promise<any> {
		return this.executeWithTracing(
			"createEnvironment",
			context,
			async (span) => {
				// Extract userId from context or use system default
				const userId = context.userId || "system";

				// By default, first environment is active
				const isActive = true;

				// If this environment should be active, deactivate others for the same user
				if (isActive) {
					await this.executeDatabase("deactivateEnvironments", async () => {
						return db
							.update(environments)
							.set({ isActive: false, updatedAt: new Date() })
							.where(
								and(
									eq(environments.userId, userId),
									eq(environments.isActive, true),
								),
							);
					});
				}

				const newEnvironment = {
					id: ulid(),
					name: envData.name,
					config: {
						type: envData.type,
						description: envData.description,
						url: envData.url,
						variables: envData.variables,
					},
					userId,
					isActive,
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				const environment = await this.executeDatabase(
					"insertEnvironment",
					async () => {
						const result = await db
							.insert(environments)
							.values(newEnvironment)
							.returning();

						return result[0];
					},
				);

				span.setAttributes({
					"environment.id": environment.id,
					"environment.name": environment.name,
					"environment.userId": environment.userId,
					"environment.isActive": environment.isActive,
				});

				await this.recordEvent(
					"user_action",
					"info",
					`Environment created: ${environment.name}`,
					{
						environmentId: environment.id,
						userId: environment.userId,
						isActive: environment.isActive,
					},
				);

				return environment;
			},
		);
	}

	/**
	 * Update environment (not implemented in original)
	 */
	async update(
		id: string,
		updates: any,
		context: ServiceContext,
	): Promise<any> {
		return this.executeWithTracing(
			"updateEnvironment",
			context,
			async (span) => {
				throw new DatabaseError("Environment update not implemented");
			},
		);
	}

	/**
	 * Delete environment (not implemented in original)
	 */
	async delete(id: string, context: ServiceContext): Promise<void> {
		return this.executeWithTracing(
			"deleteEnvironment",
			context,
			async (span) => {
				throw new DatabaseError("Environment deletion not implemented");
			},
		);
	}

	/**
	 * Activate an environment (deactivate others for the same user)
	 */
	async activateEnvironment(
		environmentId: string,
		userId: string,
		context: ServiceContext,
	): Promise<any> {
		return this.executeWithTracing(
			"activateEnvironment",
			context,
			async (span) => {
				// First, deactivate all environments for this user
				await this.executeDatabase("deactivateAll", async () => {
					return db
						.update(environments)
						.set({ isActive: false, updatedAt: new Date() })
						.where(eq(environments.userId, userId));
				});

				// Then activate the specified environment
				const activatedEnvironment = await this.executeDatabase(
					"activateOne",
					async () => {
						const result = await db
							.update(environments)
							.set({ isActive: true, updatedAt: new Date() })
							.where(
								and(
									eq(environments.id, environmentId),
									eq(environments.userId, userId),
								),
							)
							.returning();

						return result[0];
					},
				);

				if (!activatedEnvironment) {
					throw new NotFoundError("Environment", environmentId);
				}

				span.setAttributes({
					"environment.id": activatedEnvironment.id,
					"environment.name": activatedEnvironment.name,
					"environment.userId": userId,
				});

				await this.recordEvent(
					"user_action",
					"info",
					`Environment activated: ${activatedEnvironment.name}`,
					{
						environmentId: activatedEnvironment.id,
						userId: activatedEnvironment.userId,
					},
				);

				return activatedEnvironment;
			},
		);
	}
}

// Export singleton instance
export const environmentsService = new EnvironmentsAPIService();
