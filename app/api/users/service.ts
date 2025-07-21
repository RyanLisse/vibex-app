/**
 * Users API Service
 *
 * Implements user management operations with base infrastructure patterns
 * for consistent error handling, tracing, and observability.
 */

import { z } from "zod";
import { BaseCRUDService, type ServiceContext } from "@/lib/api/base-service";
import { CreateUserSchema, UpdateUserSchema } from "@/src/schemas/api-routes";

// Query schemas
export const GetUsersQuerySchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
	provider: z.enum(["github", "openai", "anthropic"]).optional(),
	isActive: z.coerce.boolean().optional(),
	search: z.string().optional(),
	sortBy: z
		.enum(["created_at", "updated_at", "name", "last_login_at"])
		.default("created_at"),
	sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
export type CreateUserDTO = z.infer<typeof CreateUserSchema>;
export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;

export class UsersAPIService extends BaseCRUDService<
	any,
	CreateUserDTO,
	UpdateUserDTO,
	GetUsersQuery
> {
	constructor() {
		super("users");
	}

	async validateCreate(data: CreateUserDTO): Promise<void> {
		// Add any user-specific validation here
		if (!data.email || !data.email.includes("@")) {
			throw new Error("Invalid email address");
		}
	}

	async validateUpdate(id: string, data: UpdateUserDTO): Promise<void> {
		// Add any user-specific validation here
		if (data.email && !data.email.includes("@")) {
			throw new Error("Invalid email address");
		}
	}
}
