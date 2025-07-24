"use client";

import React from "react";

interface InitialTaskMessageProps {
	task: Task;
	className?: string;
}

export default function InitialTaskMessage({ task, className }: InitialTaskMessageProps) {
	return (
		<div className={`p-4 bg-gray-50 rounded-lg border ${className || ""}`}>
			<div className="flex items-start space-x-3">
				<div className="flex-shrink-0">
					<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
						<span className="text-white text-sm font-medium">T</span>
					</div>
				</div>
				<div className="flex-1 min-w-0">
					<div className="text-sm font-medium text-gray-900">Task Created</div>
					<div className="mt-1">
						<h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
						{task.description && <p className="mt-2 text-sm text-gray-600">{task.description}</p>}
					</div>
					<div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
						<span>Status: {task.status}</span>
						<span>Priority: {task.priority}</span>
						{task.createdAt && (
							<span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export { InitialTaskMessage };
