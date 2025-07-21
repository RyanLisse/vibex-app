/**
 * Example: User API Implementation
 *
 * This example demonstrates how to build a complete user API
 * using the base infrastructure patterns.
 */

import { type ServiceContext, ValidationError } from "@/lib/api/base";

interface User {
	id: string;
	email: string;
	name: string;
	role: string;
	createdAt: Date;
	updatedAt: Date;
}

interface CreateUserData {
	email: string;
	name: string;
	password: string;
	role: string;
}

class UserService extends BaseCRUDService<User> {
	// Implementation would go here
	async findByEmail(email: string): Promise<User | null> {
		// Example implementation
		return null;
	}
}
