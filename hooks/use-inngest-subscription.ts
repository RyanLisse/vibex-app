"use client";

import { InngestSubscriptionState, useInngestSubscription } from "@inngest/realtime/hooks";
import { useCallback, useEffect, useState } from "react";
import { fetchRealtimeSubscriptionToken } from "@/app/actions/inngest";

interface SubscriptionToken {
	token: string;
	channel: string;
}

/**
 * Hook for managing Inngest subscription with token refresh and error handling
 */
export function useInngestSubscriptionManagement() {
	const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);
	const [tokenData, setTokenData] = useState<SubscriptionToken | null>(null);

	const refreshToken = useCallback(async (): Promise<SubscriptionToken | null> => {
		try {
			const token = await fetchRealtimeSubscriptionToken();
			if (token) {
				setTokenData(token);
				setSubscriptionEnabled(true);
				return token;
			}
			console.log("Inngest subscription disabled: No token available");
			setSubscriptionEnabled(false);
			return null;
		} catch (error) {
			console.error("Failed to refresh Inngest token:", error);
			setSubscriptionEnabled(false);
			return null;
		}
	}, []);

	// Fetch initial token
	useEffect(() => {
		refreshToken();
	}, [refreshToken]);

	const subscription = useInngestSubscription({
		token: tokenData?.token,
		channel: tokenData?.channel || "tasks",
		enabled: subscriptionEnabled && !!tokenData,
	});

	const handleError = useCallback((error: Error) => {
		console.error("Container Inngest subscription error:", error);
		setSubscriptionEnabled(false);
	}, []);

	// Handle subscription state changes
	useEffect(() => {
		if (subscription.state === InngestSubscriptionState.Closed) {
			console.log("Container Inngest subscription closed");
		} else if (subscription.state === InngestSubscriptionState.Error && subscription.error) {
			handleError(subscription.error);
		}
	}, [subscription.state, subscription.error, handleError]);

	return {
		subscription,
		subscriptionEnabled,
		refreshToken,
		handleError,
	};
}
