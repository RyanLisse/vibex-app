import type { FieldValues, UseFormReturn } from "react-hook-form";

export interface StorageHelpers {
	save: (key: string) => void;
	load: (key: string) => boolean;
	clear: (key: string) => void;
}

export function createStorageHelpers<T extends FieldValues>(
	form: UseFormReturn<T>,
	transformOnLoad?: (data: Partial<T>) => Partial<T>,
	setInitialData?: (data: Partial<T>) => void,
): StorageHelpers {
	const save = (key: string) => {
		try {
			const data = form.getValues();
			localStorage.setItem(key, JSON.stringify(data));
		} catch (_error) {}
	};

	const load = (key: string): boolean => {
		try {
			const stored = localStorage.getItem(key);
			if (stored) {
				const data = JSON.parse(stored);
				const transformedData = transformOnLoad ? transformOnLoad(data) : data;
				form.reset(transformedData);
				setInitialData?.(transformedData);
				return true;
			}
		} catch (_error) {}
		return false;
	};

	const clear = (key: string) => {
		try {
			localStorage.removeItem(key);
		} catch (_error) {}
	};

	return { save, load, clear };
}
