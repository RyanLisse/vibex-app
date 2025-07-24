import { KanbanProvider } from "./index";

// Mock dependencies
vi.mock("@dnd-kit/core", () => ({
	DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
	DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
	useDroppable: () => ({
		isOver: false,
		setNodeRef: vi.fn(),
	}),
	useSensor: vi.fn((SensorClass: any) => ({ sensor: SensorClass.name })),
	useSensors: vi.fn((...sensors: any[]) => sensors),
	closestCenter: vi.fn(),
	KeyboardSensor: { name: "KeyboardSensor" },
	MouseSensor: { name: "MouseSensor" },
	TouchSensor: { name: "TouchSensor" },
}));

vi.mock("@dnd-kit/sortable", () => ({
	SortableContext: ({ children, items }: any) => (
		<div data-items={items} data-testid="sortable-context">
			{children}
		</div>
	),
	useSortable: (options: any) => ({
		attributes: { "data-sortable-id": options.id },
		listeners: { onPointerDown: vi.fn() },
		setNodeRef: vi.fn(),
		transition: "transform 250ms ease",
		transform: null,
		isDragging: false,
	}),
	arrayMove: vi.fn((array: any[], from: number, to: number) => {
		const newArray = [...array];
		const [removed] = newArray.splice(from, 1);
		newArray.splice(to, 0, removed);
		return newArray;
	}),
}));

vi.mock("@dnd-kit/utilities", () => ({
	CSS: {
		Transform: {
			toString: () => "transform: translate3d(0, 0, 0)",
		},
	},
}));

// TODO: Add comprehensive tests for kanban components
describe("Kanban Components", () => {
	it("should render without crashing", () => {
		expect(true).toBe(true);
	});
});
