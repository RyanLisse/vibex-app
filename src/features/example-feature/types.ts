export interface ExampleItem {
	id: string;
	title: string;
	description?: string;
	status: "pending" | "in_progress" | "completed";
	priority: "low" | "medium" | "high";
	createdAt: Date;
	updatedAt: Date;
}

export interface ExampleFormData {
	title: string;
	description?: string;
	priority: "low" | "medium" | "high";
}

export interface ExampleFilter {
	status?: ExampleItem["status"];
	priority?: ExampleItem["priority"];
	searchTerm?: string;
}

export interface ExampleStore {
	items: ExampleItem[];
	filter: ExampleFilter;
	isLoading: boolean;
	error: string | null;

	// Actions
	addItem: (data: ExampleFormData) => Promise<void>;
	updateItem: (id: string, data: Partial<ExampleItem>) => Promise<void>;
	deleteItem: (id: string) => Promise<void>;
	setFilter: (filter: ExampleFilter) => void;
	fetchItems: () => Promise<void>;
}
