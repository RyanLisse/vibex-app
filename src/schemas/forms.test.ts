import { describe, expect, it } from "vitest";
import {
	contactFormSchema,
	getFieldError,
	hasFieldError,
	loginSchema,
	profileUpdateSchema,
	searchSchema,
	userRegistrationSchema,
	validateSchema,
} from "./forms";

describe("forms schemas", () => {
	describe("userRegistrationSchema", () => {
		it("should validate valid user registration data", () => {
			const validData = {
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
				password: "Password123",
				confirmPassword: "Password123",
				age: 25,
				terms: true,
				newsletter: false,
			};

			const result = userRegistrationSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should reject invalid email", () => {
			const invalidData = {
				firstName: "John",
				lastName: "Doe",
				email: "invalid-email",
				password: "Password123",
				confirmPassword: "Password123",
				age: 25,
				terms: true,
			};

			const result = userRegistrationSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it("should reject mismatched passwords", () => {
			const invalidData = {
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
				password: "Password123",
				confirmPassword: "DifferentPassword123",
				age: 25,
				terms: true,
			};

			const result = userRegistrationSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.error.issues.some((issue) =>
						issue.path.includes("confirmPassword"),
					),
				).toBe(true);
			}
		});

		it("should reject weak passwords", () => {
			const invalidData = {
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
				password: "weakpass", // no uppercase, no numbers
				confirmPassword: "weakpass",
				age: 25,
				terms: true,
			};

			const result = userRegistrationSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it("should reject if terms not accepted", () => {
			const invalidData = {
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
				password: "Password123",
				confirmPassword: "Password123",
				age: 25,
				terms: false,
			};

			const result = userRegistrationSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it("should reject underage users", () => {
			const invalidData = {
				firstName: "John",
				lastName: "Doe",
				email: "john.doe@example.com",
				password: "Password123",
				confirmPassword: "Password123",
				age: 12,
				terms: true,
			};

			const result = userRegistrationSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});
	});

	describe("contactFormSchema", () => {
		it("should validate valid contact form data", () => {
			const validData = {
				name: "John Doe",
				email: "john@example.com",
				subject: "Test Subject",
				message: "This is a test message with enough characters.",
				priority: "medium" as const,
			};

			const result = contactFormSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should reject invalid priority", () => {
			const invalidData = {
				name: "John Doe",
				email: "john@example.com",
				subject: "Test Subject",
				message: "This is a test message with enough characters.",
				priority: "invalid" as any,
			};

			const result = contactFormSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it("should reject short message", () => {
			const invalidData = {
				name: "John Doe",
				email: "john@example.com",
				subject: "Test Subject",
				message: "Short", // too short
				priority: "low" as const,
			};

			const result = contactFormSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});
	});

	describe("loginSchema", () => {
		it("should validate valid login data", () => {
			const validData = {
				email: "john@example.com",
				password: "password123",
				rememberMe: true,
			};

			const result = loginSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should validate login without rememberMe", () => {
			const validData = {
				email: "john@example.com",
				password: "password123",
			};

			const result = loginSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should reject empty password", () => {
			const invalidData = {
				email: "john@example.com",
				password: "",
			};

			const result = loginSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});
	});

	describe("searchSchema", () => {
		it("should validate valid search data", () => {
			const validData = {
				query: "test search",
				category: "posts" as const,
				sortBy: "relevance" as const,
			};

			const result = searchSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should validate with date range", () => {
			const validData = {
				query: "test search",
				dateRange: {
					from: new Date("2023-01-01"),
					to: new Date("2023-12-31"),
				},
			};

			const result = searchSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should reject invalid date range", () => {
			const invalidData = {
				query: "test search",
				dateRange: {
					from: new Date("2023-12-31"),
					to: new Date("2023-01-01"), // end before start
				},
			};

			const result = searchSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it("should reject invalid price range in filters", () => {
			const invalidData = {
				query: "test search",
				filters: {
					minPrice: 100,
					maxPrice: 50, // max less than min
				},
			};

			const result = searchSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});
	});

	describe("profileUpdateSchema", () => {
		it("should validate valid profile update", () => {
			const validData = {
				displayName: "John Doe",
				bio: "Software developer",
				website: "https://johndoe.com",
				location: "New York",
			};

			const result = profileUpdateSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should accept empty website", () => {
			const validData = {
				displayName: "John Doe",
				website: "",
			};

			const result = profileUpdateSchema.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it("should reject invalid website URL", () => {
			const invalidData = {
				displayName: "John Doe",
				website: "not-a-url",
			};

			const result = profileUpdateSchema.safeParse(invalidData);
			expect(result.success).toBe(false);
		});

		it("should validate with default preferences", () => {
			const validData = {
				displayName: "John Doe",
			};

			const result = profileUpdateSchema.safeParse(validData);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.preferences.theme).toBe("system");
				expect(result.data.preferences.notifications.email).toBe(true);
			}
		});
	});

	describe("utility functions", () => {
		describe("validateSchema", () => {
			it("should return success for valid data", () => {
				const result = validateSchema(loginSchema, {
					email: "test@example.com",
					password: "password123",
				});

				expect(result.success).toBe(true);
				expect(result.data).toEqual({
					email: "test@example.com",
					password: "password123",
				});
				expect(result.error).toBeNull();
			});

			it("should return error for invalid data", () => {
				const result = validateSchema(loginSchema, {
					email: "invalid-email",
					password: "",
				});

				expect(result.success).toBe(false);
				expect(result.data).toBeNull();
				expect(result.error).toBeDefined();
				expect(result.error?.fieldErrors).toBeDefined();
			});

			it("should handle non-ZodError exceptions", () => {
				const throwingSchema = {
					parse: () => {
						throw new Error("Unknown error");
					},
				} as any;

				const result = validateSchema(throwingSchema, {});

				expect(result.success).toBe(false);
				expect(result.error?.formErrors).toEqual(["Unknown validation error"]);
			});
		});

		describe("getFieldError", () => {
			it("should return field error when present", () => {
				const error = {
					formErrors: [],
					fieldErrors: {
						email: ["Invalid email format"],
						password: ["Password is required"],
					},
				};

				expect(getFieldError(error, "email")).toBe("Invalid email format");
				expect(getFieldError(error, "password")).toBe("Password is required");
			});

			it("should return undefined when no error", () => {
				const error = {
					formErrors: [],
					fieldErrors: {},
				};

				expect(getFieldError(error, "email")).toBeUndefined();
				expect(getFieldError(null, "email")).toBeUndefined();
			});

			it("should handle string field errors", () => {
				const error = {
					formErrors: [],
					fieldErrors: {
						email: "Invalid email format", // single string instead of array
					},
				};

				expect(getFieldError(error, "email")).toBe("Invalid email format");
			});
		});

		describe("hasFieldError", () => {
			it("should return true when field has error", () => {
				const error = {
					formErrors: [],
					fieldErrors: {
						email: ["Invalid email format"],
					},
				};

				expect(hasFieldError(error, "email")).toBe(true);
			});

			it("should return false when field has no error", () => {
				const error = {
					formErrors: [],
					fieldErrors: {},
				};

				expect(hasFieldError(error, "email")).toBe(false);
				expect(hasFieldError(null, "email")).toBe(false);
			});
		});
	});
});
