// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Users API Route - Refactored Version
 *
 * Enhanced user management using base utilities for consistency and reduced duplication
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, like, desc } from "drizzle-orm";
import { db } from "@/db";
import { users, authSessions } from "@/db/schema";
import { ulid } from "ulid";
import { BaseService } from "@/lib/api/base-service";
import { NotFoundError } from "@/lib/error-handling/error-classes";
import { UpdateTaskSchema, CreateTaskSchema } from "@/src/schemas/api-routes";

// Request validation schemas
const GetUsersQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	provider: z.enum(["github", "openai", "anthropic"]).optional(),
	isActive: z.coerce.boolean().optional(),
	search: z.string().optional(),
	sortBy: z.enum(["created_at", "updated_at", "name", "last_login_at"]).default("created_at"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Service class extending BaseAPIService
class UsersService extends BaseAPIService {
	protected static serviceName = "users-api";

	/**
	 * Get users with filtering and pagination
	 */
	static async getUsers(params: z.infer<typeof GetUsersQuerySchema>) {
		try {
			// Build query conditions
			const conditions = [];

			if (params.provider) {
				conditions.push(eq(users.provider, params.provider));
			}

			if (params.isActive !== undefined) {
				conditions.push(eq(users.isActive, params.isActive));
			}

			if (params.search) {
				conditions.push(
					like(users.name, `%${params.search}%`),
					like(users.email, `%${params.search}%`)
				);
			}

			// Build sort order
			const sortColumn = users[params.sortBy as keyof typeof users];
			const orderBy = params.sortOrder === "asc" ? sortColumn : desc(sortColumn);

			// Execute query with pagination
			const offset = (params.page - 1) * params.limit;

			const [userResults, countResult] = await Promise.all([
				db
					.select({
						id: users.id,
						email: users.email,
						name: users.name,
						avatar: users.avatar,
						provider: users.provider,
						isActive: users.isActive,
						lastLoginAt: users.lastLoginAt,
						createdAt: users.createdAt,
						updatedAt: users.updatedAt,
					})
					.from(users)
					.where(conditions.length > 0 ? and(...conditions) : undefined)
					.orderBy(orderBy)
					.limit(params.limit)
					.offset(offset),
				db
					.select({ count: users.id })
					.from(users)
					.where(conditions.length > 0 ? and(...conditions) : undefined),
			]);

			const result = {
				data: userResults,
				pagination: {
					page: params.page,
					limit: params.limit,
					total: countResult.length,
					totalPages: Math.ceil(countResult.length / params.limit),
				},
				total: countResult.length,
			};

			// Log operation (simplified)
			console.log("get_users operation completed", {
				resultCount: result.data.length,
				totalCount: result.total,
				filters: params,
			});

			return result;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Get user by ID with auth sessions
	 */
	static async getUserById(id: string) {
		try {
			const [user] = await db
				.select({
					id: users.id,
					email: users.email,
					name: users.name,
					avatar: users.avatar,
					provider: users.provider,
					providerId: users.providerId,
					profile: users.profile,
					preferences: users.preferences,
					isActive: users.isActive,
					lastLoginAt: users.lastLoginAt,
					createdAt: users.createdAt,
					updatedAt: users.updatedAt,
				})
				.from(users)
				.where(eq(users.id, id))
				.limit(1);

			if (!user) {
				throw new NotFoundError("User", id);
			}

			// Get active auth sessions
			const activeSessions = await db
				.select({
					id: authSessions.id,
					provider: authSessions.provider,
					expiresAt: authSessions.expiresAt,
					lastUsedAt: authSessions.lastUsedAt,
					organizationId: authSessions.organizationId,
					creditsGranted: authSessions.creditsGranted,
				})
				.from(authSessions)
				.where(and(eq(authSessions.userId, id), eq(authSessions.isActive, true)))
				.orderBy(authSessions.lastUsedAt);

			// Log operation (simplified)
			console.log("get_user operation completed", {
				userId: user.id,
				activeSessions: activeSessions.length,
			});

			return {
				...user,
				activeSessions,
			};
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Create or update user (upsert based on provider + providerId)
	 */
	static async upsertUser(userData: z.infer<typeof CreateUserSchema>) {
		return UsersService.withTracing("upsertUser", async () => {
			return UsersService.withTransaction(async (tx) => {
				// Check if user exists
				const [existingUser] = await tx
					.select()
					.from(users)
					.where(
						and(eq(users.provider, userData.provider), eq(users.providerId, userData.providerId))
					)
					.limit(1);

				let user;
				if (existingUser) {
					// Update existing user
					[user] = await tx
						.update(users)
						.set({
							...userData,
							lastLoginAt: new Date(),
							updatedAt: new Date(),
						})
						.where(eq(users.id, existingUser.id))
						.returning();
				} else {
					// Create new user
					const newUser = {
						id: ulid(),
						...userData,
						lastLoginAt: new Date(),
						createdAt: new Date(),
						updatedAt: new Date(),
					};
					[user] = await tx.insert(users).values(newUser).returning();
				}

				// Log operation
				await UsersService.logOperation(
					existingUser ? "update_user" : "create_user",
					"user",
					user.id,
					user.id,
					{
						provider: user.provider,
						isNew: !existingUser,
					}
				);

				return user;
			});
		});
	}

	/**
	 * Update user preferences and profile
	 */
	static async updateUser(id: string, updates: z.infer<typeof UpdateUserSchema>) {
		return UsersService.withTracing(
			"updateUser",
			async () => {
				return UsersService.withTransaction(async (tx) => {
					const [updatedUser] = await tx
						.update(users)
						.set({
							...updates,
							updatedAt: new Date(),
						})
						.where(eq(users.id, id))
						.returning();

					if (!updatedUser) {
						throw new NotFoundError("User", id);
					}

					// Log operation
					await UsersService.logOperation("update_user", "user", updatedUser.id, updatedUser.id, {
						updates,
					});

					return updatedUser;
				});
			},
			{ "user.id": id }
		);
	}
}

/**
 * GET /api/users - List users with filtering and pagination
 */
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const queryParams = Object.fromEntries(url.searchParams.entries());

		const params = GetUsersQuerySchema.parse(queryParams);
		const result = await UsersService.getUsers(params);

		return Response.json(result);
	} catch (error) {
		console.error("Error fetching users:", error);
		if (error instanceof z.ZodError) {
			return Response.json(
				{ error: "Invalid query parameters", details: error.issues },
				{ status: 400 }
			);
		}
		return Response.json({ error: "Failed to fetch users" }, { status: 500 });
	}
}

/**
 * POST /api/users - Create or update user
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const userData = CreateUserSchema.parse(body);

		const user = await UsersService.upsertUser(userData);

		return Response.json({ user });
	} catch (error) {
		console.error("Error creating/updating user:", error);
		if (error instanceof z.ZodError) {
			return Response.json({ error: "Invalid user data", details: error.issues }, { status: 400 });
		}
		return Response.json({ error: "Failed to create/update user" }, { status: 500 });
	}
}
