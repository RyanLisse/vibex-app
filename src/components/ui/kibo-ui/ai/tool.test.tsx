import {
	type AIToolStatus
} from "./tool";

// Mock dependencies
vi.mock("@/components/ui/badge", () => ({
Badge: ({ children, className, variant }: any) => (
		<span className={className} data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/components/ui/collapsible", () => ({
Collapsible: ({ children, className, ...props }: any) => (
		<div className={className} {...props}>
			{children}
		</div>
	),