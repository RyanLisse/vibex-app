"use client";

import { ExternalLink, FileText, Link as LinkIcon } from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Source {
	id: string;
	title: string;
	url?: string;
	type?: "document" | "web" | "api" | "database";
	excerpt?: string;
	confidence?: number;
}

interface AISourcesProps {
	sources?: Source[];
	children?: React.ReactNode;
	title?: string;
	className?: string;
}

export function AISources({
	sources = [],
	children,
	title = "Sources",
	className,
}: AISourcesProps) {
	return (
		<Card className={`ai-sources ${className || ""}`}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<FileText className="h-4 w-4" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{children || (
					<div className="space-y-3">
						{sources.map((source) => (
							<AISource key={source.id} source={source} />
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

interface AISourcesContentProps {
	children: React.ReactNode;
	sources?: Source[];
}

export function AISourcesContent({
	children,
	sources = [],
}: AISourcesContentProps) {
	return (
		<div className="ai-sources-content space-y-3">
			{children ||
				sources.map((source) => <AISource key={source.id} source={source} />)}
		</div>
	);
}

interface AISourceProps {
	source: Source;
	showExcerpt?: boolean;
	className?: string;
}

export function AISource({
	source,
	showExcerpt = true,
	className,
}: AISourceProps) {
	const getSourceIcon = (type?: string) => {
		switch (type) {
			case "web":
				return <LinkIcon className="h-4 w-4" />;
			case "document":
				return <FileText className="h-4 w-4" />;
			default:
				return <FileText className="h-4 w-4" />;
		}
	};

	return (
		<div className={`ai-source border rounded-lg p-3 ${className || ""}`}>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-start gap-2 flex-1">
					{getSourceIcon(source.type)}
					<div className="flex-1 min-w-0">
						<div className="font-medium text-sm truncate">{source.title}</div>
						{source.url && (
							<Button
								variant="link"
								size="sm"
								className="h-auto p-0 text-xs text-muted-foreground"
								asChild
							>
								<a href={source.url} target="_blank" rel="noopener noreferrer">
									{source.url}
									<ExternalLink className="h-3 w-3 ml-1" />
								</a>
							</Button>
						)}
						{showExcerpt && source.excerpt && (
							<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
								{source.excerpt}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					{source.type && (
						<Badge variant="secondary" className="text-xs">
							{source.type}
						</Badge>
					)}
					{source.confidence && (
						<Badge
							variant={source.confidence > 0.8 ? "default" : "outline"}
							className="text-xs"
						>
							{Math.round(source.confidence * 100)}%
						</Badge>
					)}
				</div>
			</div>
		</div>
	);
}

interface AISourcesTriggerProps {
	children?: React.ReactNode;
	onClick?: () => void;
	className?: string;
}

export function AISourcesTrigger({
	children,
	onClick,
	className,
}: AISourcesTriggerProps) {
	return (
		<Button
			variant="ghost"
			onClick={onClick}
			className={`ai-sources-trigger ${className || ""}`}
		>
			{children || (
				<>
					<FileText className="h-4 w-4 mr-2" />
					Show Sources
				</>
			)}
		</Button>
	);
}
