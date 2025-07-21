import { StreamingMessage } from "@/app/task/[id]/_types/message-types";

// Task status helpers
export type TaskStatus =
	| "IN_PROGRESS"
	| "DONE"
	| "MERGED"
	| "PAUSED"
	| "CANCELLED";

export interface TaskStatusInfo {
	status: TaskStatus;
	statusMessage?: string;
	hasChanges: boolean;
}

// Utility types
export interface RepositoryInfo {
	repository?: string;
	branch?: string;
	repoUrl?: string;
}

export interface StreamProgress {
	chunkIndex: number;
	totalChunks: number;
}
