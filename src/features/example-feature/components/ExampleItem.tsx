import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ExampleItem as ExampleItemType } from "@/src/features/example-feature/types";
	getPriorityColor,
	getStatusIcon,
} from "@/src/features/example-feature/utils/example-utils";

interface ExampleItemProps {
	item: ExampleItemType;
	onEdit?: (item: ExampleItemType) => void;
	onDelete?: (id: string) => void;
	onStatusChange?: (id: string, status: ExampleItemType["status"]) => void;
}

export function ExampleItem({
	item,
	onEdit,
	onDelete,
	onStatusChange,
}: ExampleItemProps) {
	const handleStatusToggle = () => {
		const newStatus = item.status === "completed" ? "pending" : "completed";
		onStatusChange?.(item.id, newStatus);
	};

	return (
		<article
			className={cn(
				"rounded-lg border bg-white p-4 shadow-sm",
				item.status === "completed" && "opacity-60",
			)}
			data-testid={`example-item-${item.id}`}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-1 items-start gap-3">
					<button
						aria-checked={item.status === "completed"}
						aria-label={`Mark as ${item.status === "completed" ? "pending" : "completed"}`}
						className="mt-1 text-lg transition-transform hover:scale-110"
						onClick={handleStatusToggle}
						role="checkbox"
						type="button"
					>
						{getStatusIcon(item.status)}
					</button>

					<div className="flex-1">
						<h3
							className={cn(
								"font-medium text-gray-900",
								item.status === "completed" && "line-through",
							)}
						>
							{item.title}
						</h3>

						{item.description && (
							<p className="mt-1 text-gray-600 text-sm">{item.description}</p>
						)}

						<div className="mt-2 flex items-center gap-2">
							<span
								className={cn(
									"rounded px-2 py-1 font-medium text-xs",
									getPriorityColor(item.priority),
									"bg-gray-100",
								)}
							>
								{item.priority}
							</span>

							<span className="text-gray-500 text-xs">
								{item.createdAt.toLocaleDateString()}
							</span>
						</div>
					</div>
				</div>

				<div className="flex gap-2">
					{onEdit && (
						<Button
							aria-label={`Edit ${item.title}`}
							onClick={() => onEdit(item)}
							size="sm"
							variant="outline"
						>
							Edit
						</Button>
					)}

					{onDelete && (
						<Button
							aria-label={`Delete ${item.title}`}
							className="text-red-600 hover:text-red-700"
							onClick={() => onDelete(item.id)}
							size="sm"
							variant="outline"
						>
							Delete
						</Button>
					)}
				</div>
			</div>
		</article>
	);
}
