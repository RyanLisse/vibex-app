"use client";
import { ChevronLeft,
import { SortDesc
} from "lucide-react";
import { SelectValue
} from "@/components/ui/select";
import { Table,
import { TableRow
} from "@/components/ui/table";

interface Column<T> {
	key: keyof T;
	label: string;
	sortable?: boolean;
	render?: (value: any, row: T) => React.ReactNode;
	width?: string;
}

interface DataTableProps<T> {
	data: T[];
	columns: Column<T>[];
	loading?: boolean;
	pagination?: {
		page: number;
		pageSize: number;
		total: number;
		onPageChange: (page: number) => void;
		onPageSizeChange: (pageSize: number) => void;
	};
	filters?: {
		search?: string;
		onSearchChange?: (search: string) => void;
		customFilters?: React.ReactNode;
	};
	sorting?: {
		column: keyof T | null;
		direction: "asc" | "desc" | null;
		onSort: (column: keyof T) => void;
	};
	actions?: {
		onRefresh?: () => void;
		onExport?: () => void;
		rowActions?: (row: T) => React.ReactNode;
	};
	emptyState?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
	data,
	columns,
	loading = false,
	pagination,
	filters,
	sorting,
	actions,
	emptyState,
}: DataTableProps<T>) {
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

	const toggleRowSelection = (rowId: string) => {
		const newSelection = new Set(selectedRows);
		if (newSelection.has(rowId)) {
			newSelection.delete(rowId);
		} else {
			newSelection.add(rowId);
		}
		setSelectedRows(newSelection);
	};

	const toggleAllRows = () => {
		if (selectedRows.size === data.length) {
			setSelectedRows(new Set());
		} else {
			setSelectedRows(new Set(data.map((_, index) => index.toString())));
		}
	};

	const getSortIcon = (column: keyof T) => {
		if (sorting?.column !== column) {
			return <div className="h-4 w-4" />;
		}
		return sorting.direction === "asc" ? (
			<SortAsc className="h-4 w-4" />
		) : (
			<SortDesc className="h-4 w-4" />
		);
	};

	return (
		<Card className="overflow-hidden">
			{/* Header with filters and actions */}
			<div className="border-b p-4">
				<div className="mb-4 flex items-center justify-between">
					<div className="flex items-center space-x-4">
						{filters?.search !== undefined && (
							<div className="relative">
								<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
								<Input
									className="w-64 pl-10"
									onChange={(e) => filters.onSearchChange?.(e.target.value)}
									placeholder="Search..."
									value={filters.search}
								/>
							</div>
						)}

						{filters?.customFilters && (
							<div className="flex items-center space-x-2">
								<Filter className="h-4 w-4 text-muted-foreground" />
								{filters.customFilters}
							</div>
						)}
					</div>

					<div className="flex items-center space-x-2">
						{selectedRows.size > 0 && (
							<Badge variant="secondary">{selectedRows.size} selected</Badge>
						)}

						{actions?.onRefresh && (
							<Button onClick={actions.onRefresh} size="sm" variant="outline">
								<RefreshCw className="h-4 w-4" />
							</Button>
						)}

						{actions?.onExport && (
							<Button onClick={actions.onExport} size="sm" variant="outline">
								<Download className="mr-2 h-4 w-4" />Export
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Table */}
			<ScrollArea className="h-96">
				{loading ? (
					<div className="flex h-64 items-center justify-center">
						<RefreshCw className="h-8 w-8 animate-spin" />
					</div>
				) : data.length === 0 ? (
					<div className="flex h-64 items-center justify-center">
						{emptyState || (
							<div className="text-center text-muted-foreground">
								<div className="font-medium text-lg">No data found</div>
								<div className="text-sm">Try adjusting your search or filters
								</div>
							</div>
						)}
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">
									<input
										checked={selectedRows.size === data.length}
										className="rounded"
										onChange={toggleAllRows}
										type="checkbox"
									/>
								</TableHead>
								{columns.map((column) => (
									<TableHead
										className={`${column.width || ""} ${column.sortable ? "cursor-pointer select-none" : ""}`}
										key={String(column.key)}
										onClick={() =>
											column.sortable && sorting?.onSort(column.key)
										}
									>
										<div className="flex items-center space-x-2">
											<span>{column.label}</span>
											{column.sortable && getSortIcon(column.key)}
										</div>
									</TableHead>
								))}
								{actions?.rowActions && (
									<TableHead className="w-12">
										<MoreHorizontal className="h-4 w-4" />
									</TableHead>
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map((row, index) => (
								<TableRow key={index}>
									<TableCell>
										<input
											checked={selectedRows.has(index.toString())}
											className="rounded"
											onChange={() => toggleRowSelection(index.toString())}
											type="checkbox"
										/>
									</TableCell>
									{columns.map((column) => (
										<TableCell key={String(column.key)}>
											{column.render
												? column.render(row[column.key], row)
												: String(row[column.key] || "")}
										</TableCell>
									))}
									{actions?.rowActions && (
										<TableCell>{actions.rowActions(row)}</TableCell>
									)}
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</ScrollArea>

			{/* Pagination */}
			{pagination && (
				<div className="border-t p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<span className="text-muted-foreground text-sm">Rows per page:
							</span>
							<Select
								onValueChange={(value) =>
									pagination.onPageSizeChange(Number.parseInt(value))
								}
								value={pagination.pageSize.toString()}
							>
								<SelectTrigger className="w-20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="10">10</SelectItem>
									<SelectItem value="25">25</SelectItem>
									<SelectItem value="50">50</SelectItem>
									<SelectItem value="100">100</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-center space-x-2">
							<span className="text-muted-foreground text-sm">
								{Math.min(
									(pagination.page - 1) * pagination.pageSize + 1,
									pagination.total,
								)}{" "}
								-{" "}
								{Math.min(
									pagination.page * pagination.pageSize,
									pagination.total,
								)}{" "}
								of {pagination.total}
							</span>

							<div className="flex items-center space-x-1">
								<Button
									disabled={pagination.page === 1}
									onClick={() => pagination.onPageChange(1)}
									size="sm"
									variant="outline"
								>
									<ChevronsLeft className="h-4 w-4" />
								</Button>
								<Button
									disabled={pagination.page === 1}
									onClick={() => pagination.onPageChange(pagination.page - 1)}
									size="sm"
									variant="outline"
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<Button
									disabled={
										pagination.page * pagination.pageSize >= pagination.total
									}
									onClick={() => pagination.onPageChange(pagination.page + 1)}
									size="sm"
									variant="outline"
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
								<Button
									disabled={
										pagination.page * pagination.pageSize >= pagination.total
									}
									onClick={() =>
										pagination.onPageChange(
Math.ceil(pagination.total / pagination.pageSize),
										)
									}
									size="sm"
									variant="outline"
								>
									<ChevronsRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</Card>
	);
}
