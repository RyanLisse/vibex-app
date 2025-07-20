import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
	test,
} from "bun:test";
import { renderHook } from "@testing-library/react";
import type { UseFormReturn } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFormState } from "@/src/hooks/useZodForm/formState";

describe("useFormState", () => {
	const createMockForm = (overrides = {}): UseFormReturn<any> =>
		({
			formState: {
				errors: {},
				isValid: true,
				isDirty: false,
				...overrides,
			},
		}) as any;

	it("should return correct state for pristine valid form", () => {
		const mockForm = createMockForm();
		const { result } = renderHook(() => useFormState(mockForm));

		expect(result.current).toEqual({
			hasErrors: false,
			errorCount: 0,
			isValid: true,
			isDirty: false,
		});
	});

	it("should detect errors correctly", () => {
		const mockForm = createMockForm({
			errors: {
				username: { message: "Required" },
				email: { message: "Invalid email" },
			},
		});
		const { result } = renderHook(() => useFormState(mockForm));

		expect(result.current.hasErrors).toBe(true);
		expect(result.current.errorCount).toBe(2);
	});

	it("should handle single error", () => {
		const mockForm = createMockForm({
			errors: {
				password: { message: "Too short" },
			},
		});
		const { result } = renderHook(() => useFormState(mockForm));

		expect(result.current.hasErrors).toBe(true);
		expect(result.current.errorCount).toBe(1);
	});

	it("should handle nested errors", () => {
		const mockForm = createMockForm({
			errors: {
				"user.profile.name": { message: "Required" },
				"user.settings.theme": { message: "Invalid" },
				"items.0.name": { message: "Required" },
			},
		});
		const { result } = renderHook(() => useFormState(mockForm));

		expect(result.current.hasErrors).toBe(true);
		expect(result.current.errorCount).toBe(3);
	});

	it("should consider form invalid when there are errors despite isValid flag", () => {
		const mockForm = createMockForm({
			errors: {
				field: { message: "Error" },
			},
			isValid: true, // This shouldn't happen but we handle it
		});
		const { result } = renderHook(() => useFormState(mockForm));

		expect(result.current.isValid).toBe(false);
	});

	it("should handle dirty state", () => {
		const mockForm = createMockForm({
			isDirty: true,
		});
		const { result } = renderHook(() => useFormState(mockForm));

		expect(result.current.isDirty).toBe(true);
	});

	it("should handle all states combined", () => {
		const mockForm = createMockForm({
			errors: {
				field1: { message: "Error 1" },
				field2: { message: "Error 2" },
				field3: { message: "Error 3" },
			},
			isValid: false,
			isDirty: true,
		});
		const { result } = renderHook(() => useFormState(mockForm));

		expect(result.current).toEqual({
			hasErrors: true,
			errorCount: 3,
			isValid: false,
			isDirty: true,
		});
	});

	it("should update when form state changes", () => {
		let mockForm = createMockForm();
		const { result, rerender } = renderHook(() => useFormState(mockForm));

		expect(result.current.hasErrors).toBe(false);
		expect(result.current.errorCount).toBe(0);

		// Update form state
		mockForm = createMockForm({
			errors: {
				newError: { message: "New error" },
			},
		});
		rerender();

		expect(result.current.hasErrors).toBe(true);
		expect(result.current.errorCount).toBe(1);
	});

	it("should memoize results correctly", () => {
		const mockForm = createMockForm({
			errors: {
				field: { message: "Error" },
			},
		});

		const { result, rerender } = renderHook(() => useFormState(mockForm));
		const firstResult = result.current;

		// Rerender with same form state
		rerender();
		const secondResult = result.current;

		// Results should be the same object reference due to memoization
		expect(firstResult).toBe(secondResult);
	});

	it("should handle empty error messages", () => {
		const mockForm = createMockForm({
			errors: {
				field1: { message: "" },
				field2: {}, // No message property
			},
		});
		const { result } = renderHook(() => useFormState(mockForm));

		expect(result.current.hasErrors).toBe(true);
		expect(result.current.errorCount).toBe(2);
	});

	it("should handle complex error structures", () => {
		const mockForm = createMockForm({
			errors: {
				simple: { message: "Simple error" },
				nested: {
					deep: {
						field: { message: "Nested error" },
					},
				},
				array: [{ message: "Array error 1" }, { message: "Array error 2" }],
			},
		});
		const { result } = renderHook(() => useFormState(mockForm));

		expect(result.current.hasErrors).toBe(true);
		expect(result.current.errorCount).toBe(3); // Only counts top-level keys
	});

	it("should handle form with no formState", () => {
		const mockForm = {} as any;
		const { result } = renderHook(() => useFormState(mockForm));

		// Should not throw and provide defaults
		expect(result.current).toBeDefined();
	});

	it("should recalculate when isDirty changes", () => {
		let isDirty = false;
		const mockForm = {
			formState: {
				get errors() {
					return {};
				},
				get isValid() {
					return true;
				},
				get isDirty() {
					return isDirty;
				},
			},
		} as any;

		const { result, rerender } = renderHook(() => useFormState(mockForm));

		expect(result.current.isDirty).toBe(false);

		isDirty = true;
		rerender();

		expect(result.current.isDirty).toBe(true);
	});

	it("should handle validation state transitions", () => {
		let errors: any = {};
		let isValid = true;

		const mockForm = {
			formState: {
				get errors() {
					return errors;
				},
				get isValid() {
					return isValid;
				},
				isDirty: false,
			},
		} as any;

		const { result, rerender } = renderHook(() => useFormState(mockForm));

		// Initial valid state
		expect(result.current.isValid).toBe(true);
		expect(result.current.hasErrors).toBe(false);

		// Add error
		errors = { field: { message: "Error" } };
		isValid = false;
		rerender();

		expect(result.current.isValid).toBe(false);
		expect(result.current.hasErrors).toBe(true);

		// Clear error
		errors = {};
		isValid = true;
		rerender();

		expect(result.current.isValid).toBe(true);
		expect(result.current.hasErrors).toBe(false);
	});
});
