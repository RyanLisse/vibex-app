import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Field helper utilities for form management
 */

export interface FieldHelpers<T extends FieldValues> {
	getError: (field: keyof T) => string | undefined;
	hasError: (field: keyof T) => boolean;
	clearError: (field: keyof T) => void;
	setError: (field: keyof T, error: string) => void;
}

/**
 * Creates field helper functions for a form
 */
export function createFieldHelpers<T extends FieldValues>(form: UseFormReturn<T>): FieldHelpers<T> {
	return {
		getError: (field: keyof T): string | undefined => {
			const error = form.formState.errors[field as string];
			return error?.message;
		},

		hasError: (field: keyof T): boolean => {
			return !!form.formState.errors[field as string];
		},

		clearError: (field: keyof T): void => {
			form.clearErrors(field as string);
		},

		setError: (field: keyof T, error: string): void => {
			form.setError(field as string, {
				message: error,
			});
		},
	};
}

/**
 * Gets all form errors as a flat object
 */
export function getFormErrors<T extends FieldValues>(
	form: UseFormReturn<T>
): Partial<Record<keyof T, string>> {
	const errors: Partial<Record<keyof T, string>> = {};

	for (const [field, error] of Object.entries(form.formState.errors)) {
		if (error?.message) {
			errors[field as keyof T] = error.message;
		}
	}

	return errors;
}

/**
 * Gets only the dirty fields with their values
 */
export function getDirtyFields<T extends FieldValues>(form: UseFormReturn<T>): Partial<T> {
	const dirtyFields: Partial<T> = {};
	const allValues = form.getValues();
	const dirtyFieldNames = form.formState.dirtyFields;

	for (const [field, isDirty] of Object.entries(dirtyFieldNames)) {
		if (isDirty) {
			dirtyFields[field as keyof T] = allValues[field as keyof T];
		}
	}

	return dirtyFields;
}

/**
 * Gets fields that have changed from their initial values
 */
export function getChangedFields<T extends FieldValues>(
	form: UseFormReturn<T>,
	initialData: Partial<T>
): Partial<T> {
	const changedFields: Partial<T> = {};
	const currentValues = form.getValues();

	for (const field in currentValues) {
		const currentValue = currentValues[field];
		const initialValue = initialData[field];

		// Compare values (handle undefined/null cases)
		if (currentValue !== initialValue) {
			// Only include if the field is actually dirty
			if (form.formState.dirtyFields[field]) {
				changedFields[field] = currentValue;
			}
		}
	}

	return changedFields;
}
