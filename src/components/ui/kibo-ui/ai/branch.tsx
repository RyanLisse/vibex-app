"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIBranchContextValue {
	currentBranch: number;
	totalBranches: number;
	setBranch: (branch: number) => void;
	onBranchChange?: (branch: number) => void;
}

const AIBranchContext = createContext<AIBranchContextValue | null>(null);

function useAIBranch() {
	const context = useContext(AIBranchContext);
	if (!context) {
		throw new Error("AIBranch components must be used within AIBranch");
	}
	return context;
}

interface AIBranchProps {
	children: React.ReactNode;
	className?: string;
	defaultBranch?: number;
	onBranchChange?: (branch: number) => void;
}

export function AIBranch({
	children,
	className,
	defaultBranch = 0,
	onBranchChange,
}: AIBranchProps) {
	const [currentBranch, setCurrentBranch] = useState(defaultBranch);

	const childrenArray = React.Children.toArray(children);
	const messagesChild = childrenArray.find(
		(child) => React.isValidElement(child) && child.type === AIBranchMessages,
	);

	const messagesChildren = React.isValidElement(messagesChild)
		? React.Children.toArray(messagesChild.props.children)
		: [];
	const totalBranches = messagesChildren.length;

	const setBranch = (branch: number) => {
		setCurrentBranch(branch);
		onBranchChange?.(branch);
	};

	return (
		<AIBranchContext.Provider
			value={{ currentBranch, totalBranches, setBranch, onBranchChange }}
		>
			<div className={cn("ai-branch", className)}>{children}</div>
		</AIBranchContext.Provider>
	);
}

interface AIBranchMessagesProps {
	messages?: Array<{ id: string; content: string; role: string }>;
	children?: React.ReactNode;
}

export function AIBranchMessages({
	messages = [],
	children,
}: AIBranchMessagesProps) {
	const { currentBranch } = useAIBranch();
	const childrenArray = React.Children.toArray(children);

	return (
		<div className="ai-branch-messages">
			{children
				? childrenArray.map((child, index) => (
						<div
							key={index}
							style={{ display: index === currentBranch ? "block" : "none" }}
						>
							{child}
						</div>
					))
				: messages.map((message, index) => (
						<div
							key={message.id}
							className={`message message-${message.role}`}
							style={{ display: index === currentBranch ? "block" : "none" }}
						>
							{message.content}
						</div>
					))}
		</div>
	);
}

interface AIBranchPageProps {
	className?: string;
	children?: React.ReactNode;
}

export function AIBranchPage({ className, children }: AIBranchPageProps) {
	const { currentBranch, totalBranches } = useAIBranch();

	return (
		<div
			className={cn("ai-branch-page text-xs text-muted-foreground", className)}
		>
			{children || (
				<span className="page-indicator">
					{currentBranch + 1} of {totalBranches}
				</span>
			)}
		</div>
	);
}

interface AIBranchSelectorProps {
	from: "assistant" | "user";
	children: React.ReactNode;
}

export function AIBranchSelector({ from, children }: AIBranchSelectorProps) {
	const { totalBranches } = useAIBranch();

	// Don't render if there's only one branch
	if (totalBranches <= 1) {
		return null;
	}

	return (
		<div
			className={cn(
				"ai-branch-selector flex items-center gap-2 mt-2",
				from === "assistant" ? "justify-start" : "justify-end",
			)}
		>
			{children}
		</div>
	);
}

interface AIBranchNavigationProps {
	children?: React.ReactNode;
}

export function AIBranchPrevious({ children }: AIBranchNavigationProps) {
	const { currentBranch, totalBranches, setBranch } = useAIBranch();

	const handlePrevious = () => {
		const prevBranch =
			currentBranch === 0 ? totalBranches - 1 : currentBranch - 1;
		setBranch(prevBranch);
	};

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={handlePrevious}
			aria-label="Previous branch"
			className="ai-branch-previous h-6 w-6 p-0"
		>
			{children || <ChevronLeft size={12} />}
		</Button>
	);
}

export function AIBranchNext({ children }: AIBranchNavigationProps) {
	const { currentBranch, totalBranches, setBranch } = useAIBranch();

	const handleNext = () => {
		const nextBranch =
			currentBranch === totalBranches - 1 ? 0 : currentBranch + 1;
		setBranch(nextBranch);
	};

	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={handleNext}
			aria-label="Next branch"
			className="ai-branch-next h-6 w-6 p-0"
		>
			{children || <ChevronRight size={12} />}
		</Button>
	);
}

interface AIBranchSelectorProps {
	from?: string;
	children?: React.ReactNode;
	onBranchSelect?: (branch: string) => void;
}

export function AIBranchSelector({
	from,
	children,
	onBranchSelect,
}: AIBranchSelectorProps) {
	return (
		<div className="ai-branch-selector" data-from={from}>
			{children}
		</div>
	);
}
