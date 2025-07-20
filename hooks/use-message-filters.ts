import { useCallback } from "react";
import type { MessageType } from "@/hooks/use-task-message-handler";
import {
	isStatusData,
	isStatusTopic,
	isTasksChannel,
	isUpdateData,
	isUpdateTopic,
	type LatestData,
} from "@/lib/container-types";

export interface UseMessageFiltersReturn {
	isValidMessage: (data: LatestData) => boolean;
	getMessageType: (data: LatestData) => MessageType;
	isTasksMessage: (data: LatestData) => boolean;
	isStatusMessage: (data: LatestData) => boolean;
	isUpdateMessage: (data: LatestData) => boolean;
}

export function useMessageFilters(): UseMessageFiltersReturn {
	const isValidMessage = useCallback((data: LatestData): boolean => {
		if (!isTasksChannel(data)) {
			return false;
		}

		const isValidStatus = isStatusTopic(data) && isStatusData(data.data);
		const isValidUpdate = isUpdateTopic(data) && isUpdateData(data.data);

		return isValidStatus || isValidUpdate;
	}, []);

	const getMessageType = useCallback((data: LatestData): MessageType => {
		if (!isTasksChannel(data)) {
			return "unknown";
		}

		if (isStatusTopic(data) && isStatusData(data.data)) {
			return "status";
		}

		if (isUpdateTopic(data) && isUpdateData(data.data)) {
			return "update";
		}

		return "unknown";
	}, []);

	const isTasksMessage = useCallback((data: LatestData): boolean => {
		return isTasksChannel(data);
	}, []);

	const isStatusMessage = useCallback((data: LatestData): boolean => {
		return isStatusTopic(data) && isStatusData(data.data);
	}, []);

	const isUpdateMessage = useCallback((data: LatestData): boolean => {
		return isUpdateTopic(data) && isUpdateData(data.data);
	}, []);

	return {
		isValidMessage,
		getMessageType,
		isTasksMessage,
		isStatusMessage,
		isUpdateMessage,
	};
}
