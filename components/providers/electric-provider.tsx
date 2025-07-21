"use client";

import { PGliteProvider } from "@electric-sql/pglite-react";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

interface ElectricContextValue {
	isConnected: boolean;
	isLoading: boolean;
	error: string | null;
	reconnect: () => void;
}

const ElectricContext = createContext<ElectricContextValue | null>(null);

export function useElectricContext(): ElectricContextValue {
	const context = useContext(ElectricContext);
	if (!context) {
		throw new Error(
			"useElectricContext must be used within an ElectricProvider",
		);
	}
	return context;
}

interface ElectricProviderProps {
	children: ReactNode;
}

export function ElectricProvider({ children }: ElectricProviderProps) {
	const [isConnected, setIsConnected] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const reconnect = () => {
		setIsLoading(true);
		setError(null);
		// TODO: Implement actual reconnection logic
		setTimeout(() => {
			setIsConnected(true);
			setIsLoading(false);
		}, 1000);
	};

	useEffect(() => {
		// TODO: Initialize Electric connection
		setTimeout(() => {
			setIsConnected(true);
			setIsLoading(false);
		}, 1000);
	}, []);

	const value: ElectricContextValue = {
		isConnected,
		isLoading,
		error,
		reconnect,
	};

	return (
		<ElectricContext.Provider value={value}>
			<PGliteProvider>{children}</PGliteProvider>
		</ElectricContext.Provider>
	);
}
