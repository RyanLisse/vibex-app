import { useMemo } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Form state utilities and helpers
 */

export interface FormStateHelpers<T extends FieldValues> {
	isSubmitting: boolean;
	hasErrors: boolean;
	errorCount: number;
	isValid: boolean;
	isDirty: boolean;
}

export interface FormStateInfo {
	hasErrors: boolean;
	errorCount: number;
	isValid: boolean;
	isDirty: boolean;
}

/**
 * Creates form state helpers for enhanced form state management
 */
export function createFormStateHelpers<T extends FieldValues>(
	form: UseFormReturn<T>,
	isSubmitting: boolean = false
): FormStateHelpers<T> {
	const { formState } = form;

	return {
		isSubmitting,
		hasErrors: Object.keys(formState.errors).length > 0,
		errorCount: Object.keys(formState.errors).length,
		isValid: Object.keys(formState.errors).length === 0 && formState.isValid,
		isDirty: formState.isDirty,
	};
}

/**
 * Utility to check if form is ready for submission
 */
export function isFormReadyForSubmission<T extends FieldValues>(
	form: UseFormReturn<T>,
	isSubmitting: boolean = false
): boolean {
	const { formState } = form;

	return !isSubmitting && Object.keys(formState.errors).length === 0 && formState.isValid;
}

/**
 * React hook for tracking form state information
 */
export function useFormState<T extends FieldValues>(form: UseFormReturn<T>): FormStateInfo {
	const { formState } = form;

	return useMemo(() => {
		const errorCount = Object.keys(formState.errors).length;

		return {
			hasErrors: errorCount > 0,
			errorCount,
			isValid: errorCount === 0 && formState.isValid,
			isDirty: formState.isDirty,
		};
	}, [formState.errors, formState.isValid, formState.isDirty]);
}

/**
 * Utility to get form submission state
 */
export function getFormSubmissionState<T extends FieldValues>(
	form: UseFormReturn<T>,
	isSubmitting: boolean = false
): {
	canSubmit: boolean;
	hasErrors: boolean;
	errorCount: number;
	isValid: boolean;
} {
	const { formState } = form;
	const errorCount = Object.keys(formState.errors).length;

	return {
		canSubmit: !isSubmitting && errorCount === 0 && formState.isValid,
		hasErrors: errorCount > 0,
		errorCount,
		isValid: formState.isValid,
	};
}
