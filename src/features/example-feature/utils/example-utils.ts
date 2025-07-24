import type { ExampleItem } from "@/src/features/example-feature/types";

export function filterItems(items: ExampleItem[], filter: ExampleFilter): ExampleItem[] {
	return items.filter((item) => {
		if (filter.status && item.status !== filter.status) {
			return false;
		}

		if (filter.priority && item.priority !== filter.priority) {
			return false;
		}

		if (filter.searchTerm) {
			const searchLower = filter.searchTerm.toLowerCase();
			const titleMatch = item.title.toLowerCase().includes(searchLower);
			const descriptionMatch = item.description?.toLowerCase().includes(searchLower);

			if (!(titleMatch || descriptionMatch)) {
				return false;
			}
		}

		return true;
	});
}

export function sortItems(
	items: ExampleItem[],
	sortBy: "priority" | "date" | "status"
): ExampleItem[] {
	return [...items].sort((a, b) => {
		switch (sortBy) {
			case "priority": {
				const priorityOrder = { high: 3, medium: 2, low: 1 };
				return priorityOrder[b.priority] - priorityOrder[a.priority];
			}
			case "date":
				return b.createdAt.getTime() - a.createdAt.getTime();
			case "status": {
				const statusOrder = { pending: 1, in_progress: 2, completed: 3 };
				return statusOrder[a.status] - statusOrder[b.status];
			}
			default:
				return 0;
		}
	});
}

export function getPriorityColor(priority: ExampleItem["priority"]): string {
	switch (priority) {
		case "high":
			return "text-red-600";
		case "medium":
			return "text-yellow-600";
		case "low":
			return "text-green-600";
		default:
			return "text-gray-600";
	}
}

export function getStatusIcon(status: ExampleItem["status"]): string {
	switch (status) {
		case "pending":
			return "○";
		case "in_progress":
			return "◐";
		case "completed":
			return "●";
		default:
			return "○";
	}
}
