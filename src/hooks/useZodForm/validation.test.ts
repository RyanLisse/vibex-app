import type { UseFormReturn } from "react-hook-form";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	spyOn,
	test,
	vi,
} from "vitest";
import { z } from "zod";
import {
	createSchemaValidator,
	validateAllFormFields,
	validateSingleField,
} from "./validation";

// Mock react-hook-form
vi.mock("react-hook-form", () => ({
	useForm: vi.fn(),
}));

describe("useZodForm validation utilities", () => {
	describe("createSchemaValidator", () => {
		const testSchema = z.object({
			name: z.string().min(3, "Name must be at least 3 characters"),
			age: z.number().min(18, "Must be at least 18"),
			email: z.string().email("Invalid email"),
			optional: z.string().optional(),
		});

		it("should validate valid data successfully", () => {
			const validator = createSchemaValidator(testSchema);
			const validData = {
				name: "John Doe",
				age: 25,
				email: "john@example.com",
			};

			const result = validator(validData);

			expect(result.success).toBe(true);
			expect(result.data).toEqual(validData);
			expect(result.errors).toBeUndefined();
		});

		it("should return errors for invalid data", () => {
			const validator = createSchemaValidator(testSchema);
			const invalidData = {
				name: "Jo", // Too short
				age: 16, // Too young
				email: "invalid-email", // Invalid format
			};

			const result = validator(invalidData);

			expect(result.success).toBe(false);
			expect(result.errors).toEqual({
				name: "Name must be at least 3 characters",
				age: "Must be at least 18",
				email: "Invalid email",
			});
		});

		it("should handle nested field errors", () => {
			const nestedSchema = z.object({
				user: z.object({
					profile: z.object({
						name: z.string().min(3),
					}),
				}),
			});

			const validator = createSchemaValidator(nestedSchema);
			const invalidData = {
				user: {
					profile: {
						name: "AB",
					},
				},
			};

			const result = validator(invalidData);

			expect(result.success).toBe(false);
			expect(result.errors).toEqual({
				"user.profile.name": "String must contain at least 3 character(s)",
			});
		});

		it("should handle array field errors", () => {
			const arraySchema = z.object({
				items: z.array(z.string().min(2)),
			});

			const validator = createSchemaValidator(arraySchema);
			const invalidData = {
				items: ["OK", "X", "Good"],
			};

			const result = validator(invalidData);

			expect(result.success).toBe(false);
			expect(result.errors).toEqual({
				"items.1": "String must contain at least 2 character(s)",
			});
		});

		it("should handle non-Zod errors", () => {
			const customSchema = {
				parse: () => {
					throw new Error("Custom error");
				},
			} as any;

			const validator = createSchemaValidator(customSchema);
			const result = validator({});

			expect(result.success).toBe(false);
			expect(result.errors).toEqual({
				general: "Validation failed",
			});
		});

		it("should handle optional fields", () => {
			const validator = createSchemaValidator(testSchema);
			const dataWithOptional = {
				name: "John Doe",
				age: 25,
				email: "john@example.com",
				optional: "present",
			};

			const result = validator(dataWithOptional);

			expect(result.success).toBe(true);
			expect(result.data).toEqual(dataWithOptional);
		});

		it("should handle missing required fields", () => {
			const validator = createSchemaValidator(testSchema);
			const incompleteData = {
				name: "John Doe",
				// Missing age and email
			};

			const result = validator(incompleteData);

			expect(result.success).toBe(false);
			expect(result.errors).toHaveProperty("age");
			expect(result.errors).toHaveProperty("email");
		});
	});

	describe("validateSingleField", () => {
		let mockForm: UseFormReturn<any>;
		const schema = z.object({
			username: z.string().min(3, "Username too short"),
			password: z.string().min(8, "Password too short"),
			email: z.string().email("Invalid email"),
		});

		beforeEach(() => {
			mockForm = {
				getValues: vi.fn(),
				clearErrors: vi.fn(),
				setError: vi.fn(),
			} as any;
		});

		it("should validate a valid field successfully", async () => {
			mockForm.getValues.mockReturnValue("validusername");

			const result = await validateSingleField(schema, mockForm, "username");

			expect(result).toBe(true);
			expect(mockForm.clearErrors).toHaveBeenCalledWith("username");
			expect(mockForm.setError).not.toHaveBeenCalled();
		});

		it("should set error for invalid field", async () => {
			mockForm.getValues.mockReturnValue("ab");

			const result = await validateSingleField(schema, mockForm, "username");

			expect(result).toBe(false);
			expect(mockForm.setError).toHaveBeenCalledWith("username", {
				message: "Username too short",
			});
		});

		it("should validate email field", async () => {
			mockForm.getValues.mockReturnValue("invalid-email");

			const result = await validateSingleField(schema, mockForm, "email");

			expect(result).toBe(false);
			expect(mockForm.setError).toHaveBeenCalledWith("email", {
				message: "Invalid email",
			});
		});

		it("should handle fields not in schema", async () => {
			mockForm.getValues.mockReturnValue("value");

			// This should throw as 'nonexistent' is not in the schema
			await expect(
				validateSingleField(schema, mockForm, "nonexistent" as any),
			).rejects.toThrow();
		});

		it("should handle undefined field values", async () => {
			mockForm.getValues.mockReturnValue(undefined);

			const result = await validateSingleField(schema, mockForm, "username");

			expect(result).toBe(false);
			expect(mockForm.setError).toHaveBeenCalled();
		});

		it("should handle complex field validation", async () => {
			const complexSchema = z.object({
				age: z.number().min(0).max(120),
				tags: z.array(z.string()),
			});

			mockForm.getValues.mockReturnValue(150);

			const result = await validateSingleField(complexSchema, mockForm, "age");

			expect(result).toBe(false);
			expect(mockForm.setError).toHaveBeenCalledWith("age", {
				message: expect.stringContaining("120"),
			});
		});
	});

	describe("validateAllFormFields", () => {
		let mockForm: UseFormReturn<any>;
		let validateSchema: ReturnType<typeof createSchemaValidator>;

		beforeEach(() => {
			mockForm = {
				getValues: vi.fn(),
				setError: vi.fn(),
			} as any;

			const schema = z.object({
				name: z.string().min(3),
				email: z.string().email(),
				age: z.number().positive(),
			});
			validateSchema = createSchemaValidator(schema);
		});

		it("should return true for valid form data", async () => {
			mockForm.getValues.mockReturnValue({
				name: "John Doe",
				email: "john@example.com",
				age: 25,
			});

			const result = await validateAllFormFields(mockForm, validateSchema);

			expect(result).toBe(true);
			expect(mockForm.setError).not.toHaveBeenCalled();
		});

		it("should set errors for all invalid fields", async () => {
			mockForm.getValues.mockReturnValue({
				name: "Jo",
				email: "invalid",
				age: -5,
			});

			const result = await validateAllFormFields(mockForm, validateSchema);

			expect(result).toBe(false);
			expect(mockForm.setError).toHaveBeenCalledTimes(3);
			expect(mockForm.setError).toHaveBeenCalledWith("name", {
				message: expect.any(String),
			});
			expect(mockForm.setError).toHaveBeenCalledWith("email", {
				message: expect.any(String),
			});
			expect(mockForm.setError).toHaveBeenCalledWith("age", {
				message: expect.any(String),
			});
		});

		it("should handle empty form data", async () => {
			mockForm.getValues.mockReturnValue({});

			const result = await validateAllFormFields(mockForm, validateSchema);

			expect(result).toBe(false);
			expect(mockForm.setError).toHaveBeenCalledWith("name", {
				message: expect.any(String),
			});
			expect(mockForm.setError).toHaveBeenCalledWith("email", {
				message: expect.any(String),
			});
			expect(mockForm.setError).toHaveBeenCalledWith("age", {
				message: expect.any(String),
			});
		});

		it("should handle validation success without data property", async () => {
			const customValidator = () => ({ success: true });
			mockForm.getValues.mockReturnValue({});

			const result = await validateAllFormFields(
				mockForm,
				customValidator as any,
			);

			expect(result).toBe(true);
			expect(mockForm.setError).not.toHaveBeenCalled();
		});

		it("should handle partial validation errors", async () => {
			const partialValidator = () => ({
				success: false,
				errors: {
					email: "Email required",
					// Only email error
				},
			});
			mockForm.getValues.mockReturnValue({});

			const result = await validateAllFormFields(
				mockForm,
				partialValidator as any,
			);

			expect(result).toBe(false);
			expect(mockForm.setError).toHaveBeenCalledTimes(1);
			expect(mockForm.setError).toHaveBeenCalledWith("email", {
				message: "Email required",
			});
		});

		it("should handle nested field errors", async () => {
			const nestedValidator = () => ({
				success: false,
				errors: {
					"user.profile.name": "Name required",
					"user.settings.theme": "Invalid theme",
				},
			});
			mockForm.getValues.mockReturnValue({});

			const result = await validateAllFormFields(
				mockForm,
				nestedValidator as any,
			);

			expect(result).toBe(false);
			expect(mockForm.setError).toHaveBeenCalledWith("user.profile.name", {
				message: "Name required",
			});
			expect(mockForm.setError).toHaveBeenCalledWith("user.settings.theme", {
				message: "Invalid theme",
			});
		});
	});
});
