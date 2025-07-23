import { act, render, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import { z } from "zod";
import {
	createZodFormProvider,
	useZodForm,
	useZodFormPersistence,
	useZodFormValidation,
} from "./useZodForm";

// Mock react-hook-form - Simplified version to avoid complex mocking issues
const mockFormState = {
	errors: {},
	isSubmitting: false,
	isDirty: false,
	dirtyFields: {},
	touchedFields: {},
	defaultValues: {},
	isValid: true,
	isValidating: false,
	submitCount: 0,
};

const mockFormMethods = {
	register: vi.fn(),
	handleSubmit: vi.fn((fn) => fn),
	formState: mockFormState,
	getValues: vi.fn(() => ({})),
	setValue: vi.fn(),
	setError: vi.fn(),
	clearErrors: vi.fn(),
	reset: vi.fn(),
	watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
	trigger: vi.fn(() => Promise.resolve(true)),
	control: {},
};

vi.mock("react-hook-form", () => ({
	useForm: vi.fn(() => mockFormMethods),
	useFormState: vi.fn(() => mockFormState),
	useController: vi.fn(() => ({
		field: {
			onChange: vi.fn(),
			onBlur: vi.fn(),
			value: "",
			name: "test",
			ref: vi.fn(),
		},
		fieldState: {
			invalid: false,
			isTouched: false,
			isDirty: false,
			error: undefined,
		},
		formState: mockFormState,
	})),
	Controller: vi.fn(({ render }) => render({
		field: {
			onChange: vi.fn(),
			onBlur: vi.fn(),
			value: "",
			name: "test",
			ref: vi.fn(),
		},
		fieldState: {
			invalid: false,
			isTouched: false,
			isDirty: false,
			error: undefined,
		},
	})),
}));

// Mock @hookform/resolvers/zod
vi.mock("@hookform/resolvers/zod", () => ({
	zodResolver: vi.fn(() => vi.fn()),
}));

// Mock localStorage
const mockLocalStorage = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
	value: mockLocalStorage,
	writable: true,
});

describe("useZodForm", () => {
	const testSchema = z.object({
		name: z.string().min(1, "Name is required"),
		email: z.string().email("Invalid email"),
		age: z.number().min(18, "Must be 18 or older"),
	});

	const defaultOptions = {
		schema: testSchema,
		defaultValues: {
			name: "",
			email: "",
			age: 0,
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockLocalStorage.getItem.mockImplementation(() => null);
	});

	describe("initialization", () => {
		it("should initialize with default values", () => {
			const { result } = renderHook(() => useZodForm(defaultOptions));

			expect(result.current.isSubmitting).toBe(false);
			expect(result.current.hasErrors).toBe(false);
			expect(result.current.errorCount).toBe(0);
			expect(result.current.isValid).toBe(true);
			expect(result.current.isDirty).toBe(false);
		});

		it("should apply custom default values", () => {
			const customDefaults = {
				...defaultOptions,
				defaultValues: {
					name: "John Doe",
					email: "john@example.com",
					age: 25,
				},
			};

			const { result } = renderHook(() => useZodForm(customDefaults));

			expect(result.current.getValues).toBeDefined();
		});

		it("should validate on mount when validateOnMount is true", async () => {
			const { result } = renderHook(() =>
				useZodForm({
					...defaultOptions,
					validateOnMount: true,
				}),
			);

			await waitFor(() => {
				expect(result.current.trigger).toHaveBeenCalled();
			});
		});

		it("should not validate on mount by default", () => {
			const { result } = renderHook(() => useZodForm(defaultOptions));

			expect(result.current.trigger).not.toHaveBeenCalled();
		});
	});

	describe("form submission", () => {
		it("should handle successful submission", async () => {
			const onSubmit = vi.fn();
			const formData = {
				name: "John Doe",
				email: "john@example.com",
				age: 25,
			};

			// Mock getValues to return form data
			mockFormMethods.getValues.mockReturnValue(formData);
			mockFormMethods.trigger.mockResolvedValue(true);

			const { result } = renderHook(() =>
				useZodForm({
					...defaultOptions,
					onSubmit,
				}),
			);

			await act(async () => {
				await result.current.submitForm();
			});

			expect(onSubmit).toHaveBeenCalledWith(formData);
		});

		it("should handle submission errors", async () => {
			const onError = vi.fn();
			
			// Mock form state with errors
			mockFormMethods.trigger.mockResolvedValue(false);
			mockFormMethods.formState = {
				...mockFormState,
				errors: {
					name: { message: "Name is required" },
				},
			};

			const { result } = renderHook(() =>
				useZodForm({
					...defaultOptions,
					onError,
				}),
			);

			await act(async () => {
				await result.current.submitForm();
			});

			expect(onError).toHaveBeenCalled();
		});

		it("should prevent double submission", async () => {
			const onSubmit = vi.fn();
			const { result } = renderHook(() =>
				useZodForm({
					...defaultOptions,
					onSubmit,
				}),
			);

			// Start first submission
			const firstSubmission = result.current.submitForm();

			// Try to submit again immediately
			await act(async () => {
				await result.current.submitForm();
			});

			await firstSubmission;

			// Should only be called once (second call is ignored due to isSubmitting check)
			expect(onSubmit).toHaveBeenCalledTimes(1);
		});
	});

	describe("field validation", () => {
		it("should validate single field", async () => {
			const { result } = renderHook(() => useZodForm(defaultOptions));

			const isValid = await result.current.validateField("name");

			expect(isValid).toBe(true);
		});

		it("should validate field asynchronously", async () => {
			const { result } = renderHook(() => useZodForm(defaultOptions));

			const isValid = await result.current.validateFieldAsync(
				"email",
				"valid@email.com",
			);

			expect(isValid).toBe(true);
		});

		it("should return false for invalid field value", async () => {
			const { result } = renderHook(() => useZodForm(defaultOptions));

			const isValid = await result.current.validateFieldAsync(
				"email",
				"invalid-email",
			);

			expect(isValid).toBe(false);
		});

		it("should validate all fields", async () => {
			const { result } = renderHook(() => useZodForm(defaultOptions));

			const isValid = await result.current.validateAllFields();

			expect(isValid).toBe(true);
		});
	});

	describe("form utilities", () => {
		it("should get form data", () => {
			const formData = {
				name: "John Doe",
				email: "john@example.com",
				age: 25,
			};

			mockFormMethods.getValues.mockReturnValue(formData);

			const { result } = renderHook(() => useZodForm(defaultOptions));

			expect(result.current.getFormData()).toEqual(formData);
		});

		it("should validate schema with valid data", () => {
			const { result } = renderHook(() => useZodForm(defaultOptions));

			const validationResult = result.current.validateSchema({
				name: "John Doe",
				email: "john@example.com",
				age: 25,
			});

			expect(validationResult.success).toBe(true);
			expect(validationResult.data).toEqual({
				name: "John Doe",
				email: "john@example.com",
				age: 25,
			});
		});

		it("should validate schema with invalid data", () => {
			const { result } = renderHook(() => useZodForm(defaultOptions));

			const validationResult = result.current.validateSchema({
				name: "",
				email: "invalid-email",
				age: 15,
			});

			expect(validationResult.success).toBe(false);
			expect(validationResult.errors).toBeDefined();
		});
	});

	describe("storage integration", () => {
		it("should save form data to storage", () => {
			const formData = {
				name: "John Doe",
				email: "john@example.com",
				age: 25,
			};

			mockFormMethods.getValues.mockReturnValue(formData);

			const { result } = renderHook(() => useZodForm(defaultOptions));

			act(() => {
				result.current.saveToStorage("test-form");
			});

			expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
				"form_test-form",
				JSON.stringify(formData),
			);
		});

		it("should load form data from storage", () => {
			const storedData = {
				name: "Stored Name",
				email: "stored@example.com",
				age: 30,
			};
			mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData));

			const { result } = renderHook(() => useZodForm(defaultOptions));

			act(() => {
				const loaded = result.current.loadFromStorage("test-form");
				expect(loaded).toBe(true);
			});

			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("form_test-form");
		});

		it("should clear storage", () => {
			const { result } = renderHook(() => useZodForm(defaultOptions));

			act(() => {
				result.current.clearStorage("test-form");
			});

			expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
				"form_test-form",
			);
		});
	});
});

describe("useZodFormPersistence", () => {
	const testSchema = z.object({
		name: z.string(),
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should load data on mount", async () => {
		const form = {
			loadFromStorage: vi.fn(),
			saveToStorage: vi.fn(),
			watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
		} as unknown;

		renderHook(() => useZodFormPersistence(form, "test-key"));

		await waitFor(() => {
			expect(form.loadFromStorage).toHaveBeenCalledWith("test-key");
		});
	});

	it("should auto-save when enabled", async () => {
		const form = {
			loadFromStorage: vi.fn(),
			saveToStorage: vi.fn(),
			watch: vi.fn((callback) => {
				// Simulate form change
				setTimeout(() => callback(), 100);
				return { unsubscribe: vi.fn() };
			}),
		} as unknown;

		renderHook(() => useZodFormPersistence(form, "test-key", true));

		await waitFor(() => {
			expect(form.saveToStorage).toHaveBeenCalledWith("test-key");
		});
	});

	it("should not auto-save when disabled", () => {
		const form = {
			loadFromStorage: vi.fn(),
			saveToStorage: vi.fn(),
			watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
		} as unknown;

		renderHook(() => useZodFormPersistence(form, "test-key", false));

		expect(form.watch).not.toHaveBeenCalled();
	});

	it("should clear storage", () => {
		const form = {
			loadFromStorage: vi.fn(),
			saveToStorage: vi.fn(),
			clearStorage: vi.fn(),
			watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
		} as unknown;

		const { result } = renderHook(() =>
			useZodFormPersistence(form, "test-key"),
		);

		act(() => {
			result.current.clearStorage();
		});

		expect(form.clearStorage).toHaveBeenCalledWith("test-key");
	});
});

describe("useZodFormValidation", () => {
	const testSchema = z.object({
		name: z.string(),
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should not validate when realTimeValidation is false", () => {
		const form = {
			watch: vi.fn(() => ({ unsubscribe: vi.fn() })),
			validateField: vi.fn(),
			getFieldError: vi.fn(),
		} as unknown;

		renderHook(() => useZodFormValidation(form, false));

		expect(form.watch).not.toHaveBeenCalled();
	});

	it("should validate in real-time when enabled", async () => {
		const form = {
			watch: vi.fn((callback) => {
				// Simulate field change
				setTimeout(() => callback({}, { name: "email" }), 100);
				return { unsubscribe: vi.fn() };
			}),
			validateField: vi.fn(() => Promise.resolve(true)),
			getFieldError: vi.fn(() => {}),
		} as unknown;

		const { result } = renderHook(() => useZodFormValidation(form, true));

		await waitFor(() => {
			expect(form.validateField).toHaveBeenCalledWith("email");
		});

		expect(result.current.email).toEqual({
			isValid: true,
			error: undefined,
		});
	});

	it("should track validation errors", async () => {
		const form = {
			watch: vi.fn((callback) => {
				// Simulate field change
				setTimeout(() => callback({}, { name: "email" }), 100);
				return { unsubscribe: vi.fn() };
			}),
			validateField: vi.fn(() => Promise.resolve(false)),
			getFieldError: vi.fn(() => "Invalid email"),
		} as unknown;

		const { result } = renderHook(() => useZodFormValidation(form, true));

		await waitFor(() => {
			expect(result.current.email).toEqual({
				isValid: false,
				error: "Invalid email",
			});
		});
	});
});

describe("createZodFormProvider", () => {
	const testSchema = z.object({
		name: z.string(),
	});

	it("should create form provider component", () => {
		const FormProvider = createZodFormProvider(testSchema);

		const childrenMock = vi.fn();
		childrenMock.mockReturnValue(
			React.createElement("div", null, "Form content"),
		);

		render(
			React.createElement(FormProvider, { onSubmit: vi.fn() }, childrenMock),
		);

		expect(childrenMock).toHaveBeenCalled();
		expect(childrenMock.mock.calls[0][0]).toHaveProperty("submitForm");
		expect(childrenMock.mock.calls[0][0]).toHaveProperty("getFormData");
		expect(childrenMock.mock.calls[0][0]).toHaveProperty("schema", testSchema);
	});

	it("should pass props to useZodForm", () => {
		const FormProvider = createZodFormProvider(testSchema);
		const onSubmit = vi.fn();
		const onError = vi.fn();

		const childrenMock = vi.fn();
		childrenMock.mockReturnValue(
			React.createElement("div", null, "Form content"),
		);

		render(
			React.createElement(
				FormProvider,
				{
					onSubmit,
					onError,
					validateOnMount: true,
				},
				childrenMock,
			),
		);

		expect(childrenMock).toHaveBeenCalled();
		const form = childrenMock.mock.calls[0][0];
		expect(form).toBeDefined();
	});
});