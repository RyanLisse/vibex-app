"use client";

import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AIReasoningProps {
	children: React.ReactNode;
	title?: string;
	isOpen?: boolean;
	onToggle?: () => void;
	className?: string;
}

export function AIReasoning({
	children,
	title = "AI Reasoning",
	isOpen = false,
	onToggle,
	className,
}: AIReasoningProps) {
	const [internalOpen, setInternalOpen] = React.useState(isOpen);
	const open = onToggle ? isOpen : internalOpen;
	const handleToggle = onToggle || (() => setInternalOpen(!internalOpen));

	return (
		<Card className={`ai-reasoning ${className || ""}`}>
			<Collapsible open={open} onOpenChange={handleToggle}>
				<CardHeader className="pb-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" className="w-full justify-between p-0">
							<CardTitle className="flex items-center gap-2 text-sm">
								<Brain className="h-4 w-4" />
								{title}
							</CardTitle>
							{open ? (
								<ChevronDown className="h-4 w-4" />
							) : (
								<ChevronRight className="h-4 w-4" />
							)}
						</Button>
					</CollapsibleTrigger>
				</CardHeader>
				<CollapsibleContent>
					<CardContent className="pt-0">{children}</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}

interface AIReasoningContentProps {
	children: React.ReactNode;
	steps?: Array<{
		id: string;
		title: string;
		content: string;
		status?: "pending" | "active" | "complete";
	}>;
}

export function AIReasoningContent({
	children,
	steps = [],
}: AIReasoningContentProps) {
	return (
		<div className="ai-reasoning-content space-y-3">
			{children ||
				steps.map((step) => (
					<div
						key={step.id}
						className={`reasoning-step step-${step.status || "pending"}`}
					>
						<div className="font-medium text-sm">{step.title}</div>
						<div className="text-sm text-muted-foreground mt-1">
							{step.content}
						</div>
					</div>
				))}
		</div>
	);
}

interface AIReasoningTriggerProps {
	children?: React.ReactNode;
	onClick?: () => void;
	className?: string;
}

export function AIReasoningTrigger({
	children,
	onClick,
	className,
}: AIReasoningTriggerProps) {
	return (
		<Button
			variant="ghost"
			onClick={onClick}
			className={`ai-reasoning-trigger ${className || ""}`}
		>
			{children || (
				<>
					<Brain className="h-4 w-4 mr-2" />
					Show Reasoning
				</>
			)}
		</Button>
	);
}
