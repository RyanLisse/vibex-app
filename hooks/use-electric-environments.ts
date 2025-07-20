/**
 * ElectricSQL Environment Hooks
 *
 * Real-time environment data hooks using ElectricSQL for live sync
 */

import { useEffect, useState } from "react";
import { useElectricContext } from "@/components/providers/electric-provider";

export interface Environment {
	id: string;
	name: string;
	description?: string;
	config: {
		githubOrganization?: string;
		githubRepository?: string;
		githubToken?: string;
		[key: string]: any;
	};
	isActive: boolean;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	schemaVersion?: number;
}

/**
 * Hook for real-time environments using ElectricSQL
 */
export function useElectricEnvironments(userId?: string) {
	const [environments, setEnvironments] = useState<Environment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const { isConnected, electricClient } = useElectricContext();

	useEffect(() => {
		if (!(electricClient && isConnected)) {
			setLoading(false);
			return;
		}

		let mounted = true;

		const loadEnvironments = async () => {
			try {
				setLoading(true);
				setError(null);

				// Subscribe to real-time environments
				const query = electricClient.db.environments.liveMany({
					where: userId ? { userId } : {},
					orderBy: { createdAt: "desc" },
				});

				// Handle real-time updates
				query.subscribe({
					next: (data) => {
						if (mounted) {
							setEnvironments(data);
							setLoading(false);
						}
					},
					error: (err) => {
						if (mounted) {
							setError(
								err instanceof Error
									? err
									: new Error("Failed to load environments"),
							);
							setLoading(false);
						}
					},
				});

				return () => {
					mounted = false;
					query.unsubscribe();
				};
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error
							? err
							: new Error("Failed to setup environment subscription"),
					);
					setLoading(false);
				}
			}
		};

		const cleanup = loadEnvironments();

		return () => {
			mounted = false;
			cleanup?.then((fn) => fn?.());
		};
	}, [electricClient, isConnected, userId]);

	return {
		environments,
		loading,
		error,
	};
}

/**
 * Hook for a single environment with real-time updates
 */
export function useElectricEnvironment(environmentId: string) {
	const [environment, setEnvironment] = useState<Environment | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	const { isConnected, electricClient } = useElectricContext();

	useEffect(() => {
		if (!(electricClient && isConnected && environmentId)) {
			setLoading(false);
			return;
		}

		let mounted = true;

		const loadEnvironment = async () => {
			try {
				setLoading(true);
				setError(null);

				// Subscribe to real-time environment
				const query = electricClient.db.environments.liveUnique({
					where: { id: environmentId },
				});

				query.subscribe({
					next: (data) => {
						if (mounted) {
							setEnvironment(data);
							setLoading(false);
						}
					},
					error: (err) => {
						if (mounted) {
							setError(
								err instanceof Error
									? err
									: new Error("Failed to load environment"),
							);
							setLoading(false);
						}
					},
				});

				return () => {
					mounted = false;
					query.unsubscribe();
				};
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error
							? err
							: new Error("Failed to setup environment subscription"),
					);
					setLoading(false);
				}
			}
		};

		const cleanup = loadEnvironment();

		return () => {
			mounted = false;
			cleanup?.then((fn) => fn?.());
		};
	}, [electricClient, isConnected, environmentId]);

	return {
		environment,
		loading,
		error,
	};
}
