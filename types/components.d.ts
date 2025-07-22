// Component type declarations

import type { ReactNode, ComponentProps, HTMLAttributes } from "react";

declare global {
	// Base component props
	interface BaseProps {
		className?: string;
		children?: ReactNode;
		id?: string;
		"data-testid"?: string;
	}

	// Common component prop types
	interface ButtonProps extends BaseProps {
		variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
		size?: "sm" | "md" | "lg";
		disabled?: boolean;
		loading?: boolean;
		onClick?: () => void;
		type?: "button" | "submit" | "reset";
	}

	interface InputProps extends BaseProps {
		type?: "text" | "email" | "password" | "number" | "tel" | "url";
		placeholder?: string;
		value?: string;
		defaultValue?: string;
		onChange?: (value: string) => void;
		onBlur?: () => void;
		onFocus?: () => void;
		disabled?: boolean;
		required?: boolean;
		error?: string;
		label?: string;
	}

	interface SelectProps extends BaseProps {
		options: Array<{ label: string; value: string }>;
		value?: string;
		defaultValue?: string;
		onChange?: (value: string) => void;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		error?: string;
		label?: string;
	}

	interface TextareaProps extends BaseProps {
		placeholder?: string;
		value?: string;
		defaultValue?: string;
		onChange?: (value: string) => void;
		onBlur?: () => void;
		onFocus?: () => void;
		disabled?: boolean;
		required?: boolean;
		error?: string;
		label?: string;
		rows?: number;
		cols?: number;
	}

	interface ModalProps extends BaseProps {
		isOpen: boolean;
		onClose: () => void;
		title?: string;
		size?: "sm" | "md" | "lg" | "xl";
		closeOnOverlayClick?: boolean;
		closeOnEscape?: boolean;
	}

	interface TooltipProps extends BaseProps {
		content: string;
		placement?: "top" | "bottom" | "left" | "right";
		trigger?: "hover" | "click" | "focus";
		delay?: number;
	}

	interface AlertProps extends BaseProps {
		variant?: "info" | "success" | "warning" | "error";
		title?: string;
		description?: string;
		onDismiss?: () => void;
		dismissible?: boolean;
	}

	interface BadgeProps extends BaseProps {
		variant?: "default" | "secondary" | "success" | "warning" | "error";
		size?: "sm" | "md" | "lg";
	}

	interface CardProps extends BaseProps {
		title?: string;
		description?: string;
		footer?: ReactNode;
		padding?: "none" | "sm" | "md" | "lg";
	}

	interface TabsProps extends BaseProps {
		defaultValue?: string;
		value?: string;
		onValueChange?: (value: string) => void;
		orientation?: "horizontal" | "vertical";
	}

	interface TabProps extends BaseProps {
		value: string;
		disabled?: boolean;
	}

	interface TabPanelProps extends BaseProps {
		value: string;
	}

	// Form component props
	interface FormProps extends BaseProps {
		onSubmit?: (data: any) => void | Promise<void>;
		loading?: boolean;
		disabled?: boolean;
	}

	interface FormFieldProps extends BaseProps {
		name: string;
		label?: string;
		description?: string;
		error?: string;
		required?: boolean;
	}

	// Task-specific component props
	interface TaskListProps extends BaseProps {
		tasks: Task[];
		onTaskClick?: (task: Task) => void;
		onTaskUpdate?: (task: Task) => void;
		loading?: boolean;
		error?: string;
	}

	interface TaskCardProps extends BaseProps {
		task: Task;
		onClick?: () => void;
		onUpdate?: (updates: Partial<Task>) => void;
		showActions?: boolean;
	}

	interface TaskFormProps extends BaseProps {
		task?: Partial<Task>;
		onSubmit: (task: Partial<Task>) => void | Promise<void>;
		onCancel?: () => void;
		loading?: boolean;
	}

	// Progress component props
	interface ProgressBarProps extends BaseProps {
		value: number;
		max?: number;
		size?: "sm" | "md" | "lg";
		variant?: "default" | "success" | "warning" | "error";
		showLabel?: boolean;
		label?: string;
	}

	interface ProgressDashboardProps extends BaseProps {
		metrics?: ProgressMetrics[];
		loading?: boolean;
		error?: string;
	}

	// Voice component props
	interface VoiceInputButtonProps extends BaseProps {
		onStartRecording?: () => void;
		onStopRecording?: () => void;
		isRecording?: boolean;
		disabled?: boolean;
		onError?: (error: Error) => void;
	}

	interface VoiceRecorderProps extends BaseProps {
		onRecordingComplete: (audioBlob: Blob) => void;
		onError?: (error: Error) => void;
		maxDuration?: number;
		isRecording?: boolean;
	}

	interface VoiceTaskFormProps extends BaseProps {
		transcription?: {
			text: string;
			confidence: number;
		};
		onSubmit: (task: Partial<Task>) => void;
		loading?: boolean;
	}

	// Bug reporting component props
	interface BugReportFormProps extends BaseProps {
		onSubmit: (report: any) => void;
		screenshot?: File;
		loading?: boolean;
	}

	interface ImageAnnotationToolsProps extends BaseProps {
		imageUrl: string;
		annotations: any[];
		onAnnotationAdd: (annotation: any) => void;
		onAnnotationUpdate: (id: string, annotation: any) => void;
		onAnnotationDelete: (id: string) => void;
	}

	interface QuickBugReportButtonProps extends BaseProps {
		onReportSubmit: (report: any) => void;
	}

	interface ScreenshotCaptureProps extends BaseProps {
		onCapture: (screenshot: File) => void;
		onError?: (error: Error) => void;
	}

	// Alert system props
	interface AlertSystemProps extends BaseProps {
		alerts?: any[];
		onDismiss?: (id: string) => void;
		maxAlerts?: number;
	}

	// Navigation component props
	interface NavbarProps extends BaseProps {
		user?: User;
		onUserMenuClick?: () => void;
		onLogout?: () => void;
	}

	interface SidebarProps extends BaseProps {
		isOpen?: boolean;
		onToggle?: () => void;
		navigation: Array<{
			name: string;
			href: string;
			icon?: ReactNode;
			current?: boolean;
		}>;
	}

	// Layout component props
	interface LayoutProps extends BaseProps {
		title?: string;
		description?: string;
		sidebar?: ReactNode;
		header?: ReactNode;
		footer?: ReactNode;
	}

	// Data display component props
	interface TableProps extends BaseProps {
		columns: Array<{
			key: string;
			label: string;
			sortable?: boolean;
			render?: (value: any, row: any) => ReactNode;
		}>;
		data: any[];
		loading?: boolean;
		error?: string;
		onSort?: (column: string, direction: "asc" | "desc") => void;
		onRowClick?: (row: any) => void;
	}

	interface PaginationProps extends BaseProps {
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
		showFirstLast?: boolean;
		showPrevNext?: boolean;
		maxVisiblePages?: number;
	}

	// Loading component props
	interface LoadingSpinnerProps extends BaseProps {
		size?: "sm" | "md" | "lg";
		variant?: "primary" | "secondary";
	}

	interface SkeletonProps extends BaseProps {
		width?: string | number;
		height?: string | number;
		variant?: "text" | "rectangular" | "circular";
		animation?: "pulse" | "wave" | "none";
	}
}

export {};
