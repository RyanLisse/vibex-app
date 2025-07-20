interface TaskNotFoundProps {
	taskId: string;
}

/**
 * TaskNotFound component for handling missing tasks
 * - Clean error state for missing tasks
 * - Provides helpful messaging
 * - Maintains consistent layout
 */
export function TaskNotFound({ taskId }: TaskNotFoundProps) {
	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="text-center">
				<h2 className="mb-2 font-semibold text-lg">Task not found</h2>
				<p className="text-muted-foreground">
					The task with ID "{taskId}" could not be found.
				</p>
			</div>
		</div>
	);
}
