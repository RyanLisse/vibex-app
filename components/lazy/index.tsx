/**
 * Lazy-loaded components for code splitting and performance optimization
 */

import { lazy, Suspense } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

// Lazy load heavy components to reduce initial bundle size
export const LazyMultiAgentChat = lazy(() =>
	import("@/components/agents/multi-agent-chat").then((module) => ({
		default: module.MultiAgentChat,
	}))
);

export const LazyVoiceBrainstorm = lazy(() =>
	import("@/components/agents/voice-brainstorm").then((module) => ({
		default: module.VoiceBrainstorm,
	}))
);

export const LazyComprehensiveObservabilityDashboard = lazy(() =>
	import("@/components/observability/comprehensive-observability-dashboard").then((module) => ({
		default: module.ComprehensiveObservabilityDashboard,
	}))
);

export const LazyKanbanBoard = lazy(() =>
	import("@/components/features/kanban/kanban-board").then((module) => ({
		default: module.KanbanBoard,
	}))
);

export const LazyWorkflowDesigner = lazy(() =>
	import("@/components/workflow/workflow-designer").then((module) => ({
		default: module.WorkflowDesigner,
	}))
);

// Wrapper component with loading fallback
interface LazyWrapperProps {
	children: React.ReactNode;
	fallback?: React.ComponentType;
	minHeight?: string;
}

export function LazyWrapper({
	children,
	fallback: Fallback = LoadingSkeleton,
	minHeight = "200px",
}: LazyWrapperProps) {
	return (
		<Suspense
			fallback={
				<div style={{ minHeight }} className="flex items-center justify-center">
					<Fallback />
				</div>
			}
		>
			{children}
		</Suspense>
	);
}

// Preload components for better UX
export const preloadComponents = {
	multiAgentChat: () => import("@/components/agents/multi-agent-chat"),
	voiceBrainstorm: () => import("@/components/agents/voice-brainstorm"),
	observabilityDashboard: () =>
		import("@/components/observability/comprehensive-observability-dashboard"),
	kanbanBoard: () => import("@/components/features/kanban/kanban-board"),
	workflowDesigner: () => import("@/components/workflow/workflow-designer"),
};

// Preload on hover or focus for instant loading
export function preloadOnInteraction(componentKey: keyof typeof preloadComponents) {
	return {
		onMouseEnter: () => preloadComponents[componentKey](),
		onFocus: () => preloadComponents[componentKey](),
	};
}
