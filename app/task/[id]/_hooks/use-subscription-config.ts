import { useCallback, useMemo } from "react";
import {
	fetchRealtimeSubscriptionToken,
	type TaskChannelToken,
} from "@/app/actions/inngest";

interface UseSubscriptionConfigProps {
	enabled: boolean;
	onError: (error: unknown) => void;
	onClose: () => void;
	onTokenRefresh?: (token: TaskChannelToken | null) => void;
}

export function useSubscriptionConfig({
	enabled,
	onError,
	onClose,
	onTokenRefresh,
}: UseSubscriptionConfigProps) {
	const refreshToken = useCallback(async () => {
		try {
			const token = await fetchRealtimeSubscriptionToken();

			if (!token) {
				return null as unknown as TaskChannelToken;
			}
			onTokenRefresh?.(token);
			return token;
		} catch (error) {
			onError(error);
			onTokenRefresh?.(null);
			return null as unknown as TaskChannelToken;
		}
	}, [onError, onTokenRefresh]);

	const config = useMemo(
		() => ({
			refreshToken,
			bufferInterval: 0,
			enabled,
			onError,
			onClose,
		}),
		[enabled, refreshToken, onError, onClose],
	);

	return { config, refreshToken };
}
