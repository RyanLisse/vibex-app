"use client";

import {
	CheckCircle,
	Clock,
	GitBranch,
	GitPullRequest,
	MessageSquare,
	X,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PRActionButtons } from "./pr-action-buttons";
import { PRReviewSummary } from "./pr-review-summary";
import { PRStatusBadge } from "./pr-status-badge";

export interface PRData {
	id: string;
	number: number;
	title: string;
	description?: string;
	status: "draft" | "open" | "merged" | "closed";
	author: string;
	assignees: string[];
	reviewers: string[];
	branch: {
		source: string;
		target: string;
	};
	url: string;
	createdAt: Date;
	updatedAt: Date;
	mergedAt?: Date;
	closedAt?: Date;
	checks: {
		total: number;
		passed: number;
		failed: number;
		pending: number;
	};
	reviews: {
		approved: number;
		changesRequested: number;
		pending: number;
	};
	comments: number;
	commits: number;
	additions: number;
	deletions: number;
	changedFiles: number;
	isDraft: boolean;
	mergeable: boolean;
	conflicted: boolean;
	labels: string[];
}

interface PRStatusCardProps {
	pr: PRData;
	taskId?: string;
	onAction?: (action: string, prId: string) => void;
	onUnlink?: (prId: string) => void;
	compact?: boolean;
	className?: string;
}

export function PRStatusCard({
	pr,
	taskId,
	onAction,
	onUnlink,
	compact = false,
	className = "",
}: PRStatusCardProps) {
	const getStatusIcon = (status: string) => {
		switch (status) {
			case "merged":
				return <CheckCircle className="h-4 w-4 text-purple-500" />;
			case "closed":
				return <XCircle className="h-4 w-4 text-red-500" />;
			case "draft":
				return <Clock className="h-4 w-4 text-gray-500" />;
			default:
				return <GitPullRequest className="h-4 w-4 text-green-500" />;
		}
	};

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	};

	const checksProgress = pr.checks.total > 0 ? (pr.checks.passed / pr.checks.total) * 100 : 0;
	const reviewProgress =
		pr.reviewers.length > 0 ? (pr.reviews.approved / pr.reviewers.length) * 100 : 0;

	if (compact) {
		return (
			<Card className={`hover:shadow-md transition-shadow ${className}`}>
				<CardContent className="p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3 flex-1 min-w-0">
							{getStatusIcon(pr.status)}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<h4 className="font-medium text-sm truncate">
										#{pr.number} {pr.title}
									</h4>
									<PRStatusBadge status={pr.status} size="sm" />
								</div>
								<div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
									<span>{pr.author}</span>
									<span>•</span>
									<span>{formatDate(pr.updatedAt)}</span>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							{pr.checks.total > 0 && (
								<div className="flex items-center gap-1">
									{pr.checks.failed > 0 ? (
										<XCircle className="h-3 w-3 text-red-500" />
									) : pr.checks.pending > 0 ? (
										<Clock className="h-3 w-3 text-yellow-500" />
									) : (
										<CheckCircle className="h-3 w-3 text-green-500" />
									)}
									<span className="text-xs">
										{pr.checks.passed}/{pr.checks.total}
									</span>
								</div>
							)}
							{onUnlink && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onUnlink(pr.id)}
									className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
								>
									<X className="h-3 w-3" />
								</Button>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={`hover:shadow-md transition-shadow ${className}`}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-start gap-3 flex-1 min-w-0">
						{getStatusIcon(pr.status)}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<CardTitle className="text-lg">#{pr.number}</CardTitle>
								<PRStatusBadge status={pr.status} />
								{pr.isDraft && (
									<Badge variant="outline" className="text-xs">
										Draft
									</Badge>
								)}
							</div>
							<h3 className="font-medium text-base leading-tight mb-2">{pr.title}</h3>
							{pr.description && (
								<p className="text-sm text-gray-600 line-clamp-2">{pr.description}</p>
							)}
						</div>
					</div>
					{onUnlink && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onUnlink(pr.id)}
							className="text-gray-400 hover:text-red-500"
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Branch Info */}
				<div className="flex items-center gap-2 text-sm">
					<GitBranch className="h-4 w-4 text-gray-500" />
					<span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
						{pr.branch.source}
					</span>
					<span className="text-gray-400">→</span>
					<span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
						{pr.branch.target}
					</span>
				</div>

				{/* Checks Progress */}
				{pr.checks.total > 0 && (
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Checks</span>
							<span className="text-sm text-gray-600">
								{pr.checks.passed}/{pr.checks.total} passed
							</span>
						</div>
						<Progress
							value={checksProgress}
							className={`h-2 ${
								pr.checks.failed > 0
									? "bg-red-100"
									: pr.checks.pending > 0
										? "bg-yellow-100"
										: "bg-green-100"
							}`}
						/>
						<div className="flex items-center gap-4 text-xs">
							{pr.checks.passed > 0 && (
								<span className="flex items-center gap-1 text-green-600">
									<CheckCircle className="h-3 w-3" />
									{pr.checks.passed} passed
								</span>
							)}
							{pr.checks.failed > 0 && (
								<span className="flex items-center gap-1 text-red-600">
									<XCircle className="h-3 w-3" />
									{pr.checks.failed} failed
								</span>
							)}
							{pr.checks.pending > 0 && (
								<span className="flex items-center gap-1 text-yellow-600">
									<Clock className="h-3 w-3" />
									{pr.checks.pending} pending
								</span>
							)}
						</div>
					</div>
				)}

				{/* Review Summary */}
				<PRReviewSummary reviews={pr.reviews} reviewers={pr.reviewers} compact />

				{/* Stats */}
				<div className="grid grid-cols-3 gap-4 text-sm">
					<div className="text-center">
						<div className="font-medium">{pr.commits}</div>
						<div className="text-gray-500 text-xs">Commits</div>
					</div>
					<div className="text-center">
						<div className="font-medium text-green-600">+{pr.additions}</div>
						<div className="text-gray-500 text-xs">Additions</div>
					</div>
					<div className="text-center">
						<div className="font-medium text-red-600">-{pr.deletions}</div>
						<div className="text-gray-500 text-xs">Deletions</div>
					</div>
				</div>

				{/* Labels */}
				{pr.labels.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{pr.labels.slice(0, 5).map((label) => (
							<Badge key={label} variant="outline" className="text-xs">
								{label}
							</Badge>
						))}
						{pr.labels.length > 5 && (
							<Badge variant="outline" className="text-xs">
								+{pr.labels.length - 5}
							</Badge>
						)}
					</div>
				)}

				{/* Metadata */}
				<div className="flex items-center justify-between text-sm text-gray-600">
					<div className="flex items-center gap-4">
						<span>by {pr.author}</span>
						{pr.comments > 0 && (
							<div className="flex items-center gap-1">
								<MessageSquare className="h-3 w-3" />
								<span>{pr.comments}</span>
							</div>
						)}
					</div>
					<div className="text-xs">
						{pr.status === "merged" && pr.mergedAt
							? `Merged ${formatDate(pr.mergedAt)}`
							: pr.status === "closed" && pr.closedAt
								? `Closed ${formatDate(pr.closedAt)}`
								: `Updated ${formatDate(pr.updatedAt)}`}
					</div>
				</div>

				{/* Action Buttons */}
				<PRActionButtons pr={pr} onAction={onAction} taskId={taskId} />
			</CardContent>
		</Card>
	);
}

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
