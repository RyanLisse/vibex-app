import { useCallback, useState } from "react";

export interface Toast {
	id: string;
	title: string;
	description?: string;
	variant?: "default" | "destructive";
}

interface ToastState {
	toasts: Toast[];
}

const toastState: ToastState = { toasts: [] };
let listeners: Array<(state: ToastState) => void> = [];

const notify = () => {
	listeners.forEach((listener) => listener(toastState));
};

export const useToast = () => {
	const [, forceUpdate] = useState({});

	const subscribe = useCallback((listener: (state: ToastState) => void) => {
		listeners.push(listener);
		return () => {
			listeners = listeners.filter((l) => l !== listener);
		};
	}, []);

	const toast = useCallback(({ title, description, variant = "default" }: Omit<Toast, "id">) => {
		const id = Math.random().toString(36).substr(2, 9);
		const newToast: Toast = { id, title, description, variant };

		toastState.toasts.push(newToast);
		notify();

		// Auto-remove after 5 seconds
		setTimeout(() => {
			toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
			notify();
		}, 5000);
	}, []);

	const dismiss = useCallback((id: string) => {
		toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
		notify();
	}, []);

	// Subscribe to state changes
	useState(() => {
		const unsubscribe = subscribe(() => {
			forceUpdate({});
		});
		return unsubscribe;
	});

	return {
		toast,
		dismiss,
		toasts: toastState.toasts,
	};
};
