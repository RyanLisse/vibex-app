import { SelectValue
} from "./select";

// Mock Radix UI Select components
vi.mock("@radix-ui/react-select", () => ({
Root: ({ children, ...props }: any) => (
		<div data-testid="select-root" {...props}>
			{children}
		</div>
	),
Group: ({ children, ...props }: any) => (
		<div data-testid="select-group-primitive" {...props}>
			{children}
		</div>
	),
Value: ({ children, placeholder, ...props }: any) => (
		<span data-testid="select-value-primitive" {...props}>
			{children || placeholder}
		</span>
	),
Trigger: ({ children, className, ...props }: any) => (
		<button
			className={className}
			data-testid="select-trigger-primitive"
			{...props}
		>
			{children}
		</button>
	),
Icon: ({ children, asChild }: any) =>
		asChild ? children : <span>{children}</span>,