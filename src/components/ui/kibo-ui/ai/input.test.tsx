import { AIInputTools
} from "./input";

// Mock components

vi.mock("/components/ui/button", () => ({
Button: ({
		children,
		onClick,
		disabled,
		className,
		size,
		variant,
		type,
		...props
	}: any) => (
		<button
			className={className}
			data-size={size}
			data-variant={variant}
			disabled={disabled}
			onClick={onClick}
			type={type}
			{...props}
		>
			{children}
		</button>
	),
}));

vi.mock("/components/ui/textarea", () => ({
Textarea: ({
		onChange,
		onKeyDown,
		className,
		placeholder,
		name,
		...props
	}: any) => (
		<textarea
			className={className}
			name={name}
			onChange={onChange}
			onKeyDown={onKeyDown}
			placeholder={placeholder}
			{...props}
		/>
	),
}));

vi.mock("/components/ui/select", () => ({
Select: ({ children, onValueChange, value, ...props }: any) => (
		<div data-testid="select" data-value={value} {...props}>
			{children}
		</div>
	),
SelectContent: ({ children, className, ...props }: any) => (
		<div className={className} {...props}>
			{children}
		</div>
	),