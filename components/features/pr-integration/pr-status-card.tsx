"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskPRLink } from "@/src/schemas/enhanced-task-schemas";
import { PRStatusBadge } from "./pr-status-badge";

interface PRStatusCardProps {
	prLink: TaskPRLink;
	className?: string;
}

export function PRStatusCard({ prLink, className }: PRStatusCardProps) {
	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<CardTitle className="text-sm font-medium">Pull Request #{prLink.prNumber}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					<h4 className="font-medium text-sm">{prLink.title}</h4>
					<p className="text-xs text-gray-600">by {prLink.author}</p>
				</div>

				<div className="flex items-center justify-between">
					<PRStatusBadge status={prLink.status} />
					<a
						href={prLink.prUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-blue-600 hover:text-blue-800"
					>
						View PR →
					</a>
				</div>

				<div className="text-xs text-gray-500">
					<p>Created: {new Date(prLink.createdAt).toLocaleDateString()}</p>
					<p>Updated: {new Date(prLink.updatedAt).toLocaleDateString()}</p>
				</div>
			</CardContent>
		</Card>
	);
}
