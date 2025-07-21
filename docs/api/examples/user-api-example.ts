/**
 * Example: User API Implementation
 *
 * This example demonstrates how to build a complete user API
 * using the base infrastructure patterns.
 */

import { ValidationError
} from "@/lib/api/base";
import {
	type ServiceContext
} from "@/lib/api/base";

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

class UserService extends BaseCRUDService<
import { User,