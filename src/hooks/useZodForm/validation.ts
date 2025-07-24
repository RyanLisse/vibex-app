import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";

/**
 * Validation utilities for Zod form handling
 */

export interface ValidationResult<T> {
	success: boolean;
	data?: T;
	errors?: Record<string, string>;
}

/**
 * Creates a schema validator function that can validate data against a Zod schema
 */
export function createSchemaValidator<T>(
	schema: z.ZodSchema<T>
): (data: unknown) => ValidationResult<T> {
	return (data: unknown): ValidationResult<T> => {
		try {
			const result = schema.parse(data);
			return {
				success: true,
				data: result,
			};
		} catch (error) {
			if (error instanceof z.ZodError) {
				const errors: Record<string, string> = {};

				for (const issue of error.issues) {
					const path = issue.path.join(".");
					errors[path] = issue.message;
				}

				return {
					success: false,
					errors,
				};
			}

			// Handle non-Zod errors
			return {
				success: false,
				errors: {
					general: "Validation failed",
				},
			};
		}
	};
}

/**
 * Validates a single field in the form
 */
export async function validateSingleField<T>(
	schema: z.ZodSchema<T>,
	form: UseFormReturn<T>,
	field: keyof T
): Promise<boolean> {
	try {
		const fieldValue = form.getValues(field as string);

		// Create a schema that only validates this field
		const fieldSchema = schema.pick({ [field]: true } as Record<keyof T, true>);
		const fieldData = { [field]: fieldValue } as Partial<T>;

		fieldSchema.parse(fieldData);

		// Clear any existing errors for this field
		form.clearErrors(field as string);
		return true;
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issue = error.issues[0]; // Get the first issue for this field
			form.setError(field as string, {
				message: issue.message,
			});
		} else {
			form.setError(field as string, {
				message: "Validation failed",
			});
		}
		return false;
	}
}

/**
 * Validates all fields in the form
 */
export async function validateAllFormFields<T>(
	form: UseFormReturn<T>,
	validateSchema: (data: unknown) => ValidationResult<T>
): Promise<boolean> {
	const formData = form.getValues();
	const result = validateSchema(formData);

	if (result.success) {
		return true;
	}

	// Set errors for all invalid fields
	if (result.errors) {
		for (const [field, message] of Object.entries(result.errors)) {
			form.setError(field, {
				message,
			});
		}
	}

	return false;
}
