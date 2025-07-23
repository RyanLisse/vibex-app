import React from "react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  createdAt: Date;
}

interface TaskListProps {
  tasks?: Task[];
  className?: string;
  onTaskClick?: (task: Task) => void;
}

const TaskList = React.forwardRef<HTMLDivElement, TaskListProps>(
  ({ tasks = [], className, onTaskClick, ...props }, ref) => {
    const getStatusColor = (status: Task["status"]) => {
      switch (status) {
        case "completed":
          return "text-green-600 bg-green-50";
        case "in-progress":
          return "text-blue-600 bg-blue-50";
        case "cancelled":
          return "text-red-600 bg-red-50";
        default:
          return "text-gray-600 bg-gray-50";
      }
    };

    if (tasks.length === 0) {
      return (
        <div
          ref={ref}
          className={cn("text-center py-8 text-gray-500", className)}
          {...props}
        >
          No tasks found
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-4 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => onTaskClick?.(task)}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">{task.title}</h3>
              <span
                className={cn(
                  "px-2 py-1 text-xs rounded-full",
                  getStatusColor(task.status)
                )}
              >
                {task.status}
              </span>
            </div>
            {task.description && (
              <p className="mt-2 text-sm text-gray-600">{task.description}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              Created: {task.createdAt.toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    );
  }
);

TaskList.displayName = "TaskList";

export default TaskList;