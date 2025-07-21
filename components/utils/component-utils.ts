/**
 * React Component Utility Functions
 *
 * Common patterns and utilities for reducing component complexity
 * and improving reusability across the application.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook for managing loading states with error handling
 */
export function useAsyncOperation<T>() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<T | null>(null);

	const execute = useCallback(async (operation: () => Promise<T>) => {
		setIsLoading(true);
		setError(null);

		try {
			const result = await operation();
			setData(result);
			return result;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Operation failed";
			setError(errorMessage);
			throw err;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const reset = useCallback(() => {
		setIsLoading(false);
		setError(null);
		setData(null);
	}, []);

	return {
		isLoading,
		error,
		data,
		execute,
		reset,
	};
}

/**
 * Custom hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

/**
 * Custom hook for handling form state with validation
 */
export function useFormState<T extends Record<string, any>>(
	initialState: T,
	validators?: Partial<Record<keyof T, (value: any) => string | null>>,
) {
	const [values, setValues] = useState<T>(initialState);
	const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
	const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

	const setValue = useCallback(
		(field: keyof T, value: any) => {
			setValues((prev) => ({ ...prev, [field]: value }));

			// Validate field if validator exists
			if (validators?.[field]) {
				const error = validators[field]!(value);
				setErrors((prev) => ({ ...prev, [field]: error || undefined }));
			}
		},
		[validators],
	);

	const setFieldTouched = useCallback(
		(field: keyof T) => {
			setTouched((prev) => ({ ...prev, [field]: true }));
		},
		[setTouched],
	);

	const validateAll = useCallback(() => {
		if (!validators) return true;

		const newErrors: Partial<Record<keyof T, string>> = {};
		let isValid = true;

		for (const field in validators) {
			const validator = validators[field];
			if (validator) {
				const error = validator(values[field]);
				if (error) {
					newErrors[field] = error;
					isValid = false;
				}
			}
		}

		setErrors(newErrors);
		setTouched((prev) => {
			const newTouched = { ...prev };
			for (const field in validators) {
				newTouched[field] = true;
			}
			return newTouched;
		});
		return isValid;
	}, [validators, values, setTouched]);

	const reset = useCallback(() => {
		setValues(initialState);
		setErrors({});
		setTouched({});
	}, [initialState, setTouched]);

	return {
		values,
		errors,
		touched,
		setValue,
		setTouched,
		validateAll,
		reset,
		isValid: Object.keys(errors).length === 0,
	};
}

/**
 * Custom hook for managing previous value
 */
export function usePrevious<T>(value: T): T | undefined {
	const ref = useRef<T>();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
}

/**
 * Custom hook for detecting clicks outside element
 */
export function useClickOutside<T extends HTMLElement>(
	callback: () => void,
): React.RefObject<T> {
	const ref = useRef<T>(null);

	useEffect(() => {
		const handleClick = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				callback();
			}
		};

		document.addEventListener("mousedown", handleClick);
		return () => {
			document.removeEventListener("mousedown", handleClick);
		};
	}, [callback]);

	return ref;
}

/**
 * Custom hook for managing local storage with JSON serialization
 */
export function useLocalStorage<T>(
	key: string,
	initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
	const [storedValue, setStoredValue] = useState<T>(() => {
		try {
			const item = window.localStorage.getItem(key);
			return item ? JSON.parse(item) : initialValue;
		} catch (error) {
			console.error(`Error reading localStorage key "${key}":`, error);
			return initialValue;
		}
	});

	const setValue = useCallback(
		(value: T | ((val: T) => T)) => {
			try {
				const valueToStore =
					value instanceof Function ? value(storedValue) : value;
				setStoredValue(valueToStore);
				window.localStorage.setItem(key, JSON.stringify(valueToStore));
			} catch (error) {
				console.error(`Error setting localStorage key "${key}":`, error);
			}
		},
		[key, storedValue],
	);

	return [storedValue, setValue];
}

/**
 * Custom hook for interval-based updates
 */
export function useInterval(callback: () => void, delay: number | null) {
	const savedCallback = useRef(callback);

	// Remember the latest callback
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	// Set up the interval
	useEffect(() => {
		if (delay !== null) {
			const id = setInterval(() => savedCallback.current(), delay);
			return () => clearInterval(id);
		}
	}, [delay]);
}

/**
 * Utility for creating conditional class names
 */
export function classNames(
	...classes: (string | undefined | null | boolean)[]
): string {
	return classes.filter(Boolean).join(" ");
}

/**
 * Utility for handling async event handlers
 */
export function createAsyncHandler<T extends any[]>(
	handler: (...args: T) => Promise<void>,
	onError?: (error: Error) => void,
) {
	return (...args: T) => {
		handler(...args).catch((error) => {
			if (onError) {
				onError(error);
			} else {
				console.error("Async handler error:", error);
			}
		});
	};
}

/**
 * Utility for safe array access
 */
export function safeArrayAccess<T>(
	array: T[],
	index: number,
	fallback?: T,
): T | undefined {
	if (index >= 0 && index < array.length) {
		return array[index];
	}
	return fallback;
}

/**
 * Utility for truncating text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.substring(0, maxLength - 3)}...`;
}

/**
 * Utility for formatting file sizes
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Utility for generating random IDs
 */
export function generateId(prefix = "id"): string {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Utility for capitalizing first letter
 */
export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Utility for validating email addresses
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Utility for validating URLs
 */
export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Type for component ref forwarding
 */
export type ForwardedRef<T> = React.ForwardedRef<T>;

/**
 * Generic component props with children
 */
export interface ComponentProps {
	className?: string;
	children?: React.ReactNode;
}

/**
 * Props for loading state components
 */
export interface LoadingProps {
	isLoading: boolean;
	error?: string | null;
	retry?: () => void;
}

/**
 * Props for form field components
 */
export interface FieldProps {
	name: string;
	label?: string;
	error?: string;
	required?: boolean;
	disabled?: boolean;
}
