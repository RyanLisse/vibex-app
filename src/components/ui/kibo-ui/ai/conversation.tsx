"use client";

import { ArrowDownIcon } from "lucide-react";
import type * as React from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIConversationProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

export function AIConversation({
	children,
	className,
	...props
}: AIConversationProps) {
	return (
		<StickToBottom
			className={cn("flex flex-col h-full", className)}
			role="log"
			{...props}
		>
			{children}
		</StickToBottom>
	);
}

interface AIConversationContentProps
	extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

export function AIConversationContent({
	children,
	className,
	...props
}: AIConversationContentProps) {
	return (
		<div
			className={cn("flex-1 overflow-y-auto p-4 space-y-4", className)}
			{...props}
		>
			{children}
		</div>
	);
}

interface AIConversationScrollButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	className?: string;
}

export function AIConversationScrollButton({
	className,
	...props
}: AIConversationScrollButtonProps) {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext();

	if (isAtBottom) {
		return null;
	}

	return (
		<Button
			type="button"
			variant="secondary"
			size="sm"
			className={cn(
				"absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full shadow-lg",
				className,
			)}
			onClick={scrollToBottom}
			{...props}
		>
			<ArrowDownIcon className="h-4 w-4" />
		</Button>
	);
}
