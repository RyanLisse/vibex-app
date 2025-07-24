import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Storage helper utilities for form persistence
 */

export interface StorageHelpers {
	save: (key: string) => void;
	load: (key: string) => boolean;
	clear: (key: string) => void;
}

/**
 * Creates storage helper functions for form persistence
 */
export function createStorageHelpers<T extends FieldValues>(
	form: UseFormReturn<T>,
	transformOnLoad?: (data: Partial<T>) => Partial<T>,
	setInitialData?: (data: Partial<T>) => void
): StorageHelpers {
	const getStorageKey = (key: string) => `form_${key}`;

	return {
		save: (key: string): void => {
			try {
				const formData = form.getValues();
				const storageKey = getStorageKey(key);
				localStorage.setItem(storageKey, JSON.stringify(formData));
			} catch (error) {
				console.warn("Failed to save form data to localStorage:", error);
			}
		},

		load: (key: string): boolean => {
			try {
				const storageKey = getStorageKey(key);
				const stored = localStorage.getItem(storageKey);

				if (!stored) {
					return false;
				}

				const data = JSON.parse(stored) as Partial<T>;
				const transformedData = transformOnLoad ? transformOnLoad(data) : data;

				// Set values in the form
				for (const [field, value] of Object.entries(transformedData)) {
					if (value !== undefined) {
						form.setValue(field as keyof T, value);
					}
				}

				// Update initial data if setter is provided
				if (setInitialData) {
					setInitialData(transformedData);
				}

				return true;
			} catch (error) {
				console.warn("Failed to load form data from localStorage:", error);
				return false;
			}
		},

		clear: (key: string): void => {
			try {
				const storageKey = getStorageKey(key);
				localStorage.removeItem(storageKey);
			} catch (error) {
				console.warn("Failed to clear form data from localStorage:", error);
			}
		},
	};
}
