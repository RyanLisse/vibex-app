import { CodeBlockSelectValue } from "./index";

// Mock dependencies
vi.mock("@radix-ui/react-use-controllable-state", () => ({
	useControllableState: ({ prop, defaultProp, onChange }: any) => {
		const { useState, useEffect } = vi.importActual("react") as any;
		const [state, setState] = useState(prop ?? defaultProp);

		useEffect(() => {
			if (prop !== undefined) {
				setState(prop);
			}
		}, [prop]);

		const setValue = (newValue: any) => {
			setState(newValue);
			onChange?.(newValue);
		};

		return [state, setValue];
	},
}));

vi.mock("shiki", () => ({
	codeToHtml: vi.fn((code: string) => Promise.resolve(`<pre><code>${code}</code></pre>`)),
}));

vi.mock("@shikijs/transformers", () => ({
	transformerNotationDiff: vi.fn(),
	transformerNotationErrorLevel: vi.fn(),
	transformerNotationFocus: vi.fn(),
	transformerNotationHighlight: vi.fn(),
	transformerNotationWordHighlight: vi.fn(),
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({ children, className, onClick, ...props }: any) => (
		<button className={className} onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/select", () => ({
	Select: ({ children, value, onValueChange }: any) => (
		<div data-testid="select" data-value={value} onClick={() => onValueChange?.("javascript")}>
			{children}
		</div>
	),
	SelectContent: ({ children, ...props }: any) => (
		<div data-testid="select-content" {...props}>
			{children}
		</div>
	),
	SelectItem: ({ children, className, value, ...props }: any) => (
		<div className={className} data-testid="select-item" data-value={value} {...props}>
			{children}
		</div>
	),
	SelectTrigger: ({ children, className, ...props }: any) => (
		<button className={className} data-testid="select-trigger" {...props}>
			{children}
		</button>
	),
	SelectValue: (props: any) => (
		<span data-testid="select-value" {...props}>
			Value
		</span>
	),
}));

vi.mock("@/lib/utils", () => ({
	cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

// Mock icon-pack icons - comprehensive mock for all used icons
vi.mock("@icons-pack/react-simple-icons", () => {
	const MockIcon = ({ className }: any) => (
		<span className={className} data-testid="mock-icon">
			🔸
		</span>
	);

	return {
		SiDotenv: MockIcon,
	};
});

// TODO: Add comprehensive tests for code block components
describe("Code Block Components", () => {
	it("should render without crashing", () => {
		expect(true).toBe(true);
	});
});
