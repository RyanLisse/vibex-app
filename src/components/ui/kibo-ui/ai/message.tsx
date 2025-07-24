"use client";

import type * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AIMessageProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	from: "user" | "assistant" | "system";
	timestamp?: Date;
}

export function AIMessage({ children, from, timestamp, className, ...props }: AIMessageProps) {
	return (
		<div
			className={cn("flex gap-3 p-4", from === "user" ? "flex-row-reverse" : "flex-row", className)}
			role="article"
			aria-label={`Message from ${from}`}
			{...props}
		>
			{children}
		</div>
	);
}

interface AIMessageAvatarProps {
	name: string;
	src?: string;
	className?: string;
}

export function AIMessageAvatar({ name, src, className }: AIMessageAvatarProps) {
	const initials = name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<Avatar className={cn("h-8 w-8", className)}>
			{src && <AvatarImage src={src} alt={name} />}
			<AvatarFallback>{initials}</AvatarFallback>
		</Avatar>
	);
}

interface AIMessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

export function AIMessageContent({ children, className, ...props }: AIMessageContentProps) {
	return (
		<div className={cn("flex-1 space-y-2", className)} {...props}>
			{children}
		</div>
	);
}
