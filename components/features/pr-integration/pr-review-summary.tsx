"use client";

import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PRReviewSummaryProps {
	reviews: {
		approved: number;
		changesRequested: number;
		pending: number;
	};
	reviewers: string[];
	compact?: boolean;
	className?: string;
}

export function PRReviewSummary({
	reviews,
	reviewers,
	compact = false,
	className = "",
}: PRReviewSummaryProps) {
	const totalReviewers = reviewers.length;
	const totalReviews = reviews.approved + reviews.changesRequested + reviews.pending;
	const reviewProgress = totalReviewers > 0 ? (reviews.approved / totalReviewers) * 100 : 0;

	if (totalReviewers === 0) {
		return <div className={`text-sm text-gray-500 ${className}`}>No reviewers assigned</div>;
	}

	if (compact) {
		return (
			<div className={`space-y-2 ${className}`}>
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium">Reviews</span>
					<span className="text-sm text-gray-600">
						{reviews.approved}/{totalReviewers} approved
					</span>
				</div>
				<Progress
					value={reviewProgress}
					className={`h-2 ${
						reviews.changesRequested > 0
							? "bg-red-100"
							: reviews.pending > 0
								? "bg-yellow-100"
								: "bg-green-100"
					}`}
				/>
			</div>
		);
	}

	return (
		<div className={`space-y-3 ${className}`}>
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium">Review Status</span>
				<span className="text-sm text-gray-600">
					{reviews.approved}/{totalReviewers} approved
				</span>
			</div>

			<Progress
				value={reviewProgress}
				className={`h-2 ${
					reviews.changesRequested > 0
						? "bg-red-100"
						: reviews.pending > 0
							? "bg-yellow-100"
							: "bg-green-100"
				}`}
			/>

			<div className="flex items-center gap-4 text-xs">
				{reviews.approved > 0 && (
					<span className="flex items-center gap-1 text-green-600">
						<CheckCircle className="h-3 w-3" />
						{reviews.approved} approved
					</span>
				)}
				{reviews.changesRequested > 0 && (
					<span className="flex items-center gap-1 text-red-600">
						<XCircle className="h-3 w-3" />
						{reviews.changesRequested} changes requested
					</span>
				)}
				{reviews.pending > 0 && (
					<span className="flex items-center gap-1 text-yellow-600">
						<Clock className="h-3 w-3" />
						{reviews.pending} pending
					</span>
				)}
			</div>

			{/* Reviewer List */}
			<div className="space-y-1">
				<span className="text-xs font-medium text-gray-700">Reviewers:</span>
				<div className="flex flex-wrap gap-1">
					{reviewers.map((reviewer, index) => (
						<span key={reviewer} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
							{reviewer}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

import { CheckCircle, Clock, XCircle } from "lucide-react";
import type { TaskPRLink } from "@/src/schemas/enhanced-task-schemas";

interface PRReviewSummaryProps {
	prLink: TaskPRLink;
	checks?: Array<{
		name: string;
		status: "pending" | "success" | "failure" | "error";
		conclusion?: string;
	}>;
}

export function PRReviewSummary({ prLink, checks = [] }: PRReviewSummaryProps) {
	const getStatusIcon = (status: string) => {
		switch (status) {
			case "success":
				return <CheckCircle className="w-4 h-4 text-green-600" />;
			case "failure":
			case "error":
				return <XCircle className="w-4 h-4 text-red-600" />;
			case "pending":
				return <Clock className="w-4 h-4 text-yellow-600" />;
			default:
				return <Clock className="w-4 h-4 text-gray-600" />;
		}
	};

	const successCount = checks.filter((check) => check.status === "success").length;
	const failureCount = checks.filter(
		(check) => check.status === "failure" || check.status === "error"
	).length;
	const pendingCount = checks.filter((check) => check.status === "pending").length;

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="font-medium">PR #{prLink.prNumber}</h4>
				<span className="text-sm text-gray-500">{prLink.status}</span>
			</div>

			<div className="text-sm">
				<p className="font-medium">{prLink.title}</p>
				<p className="text-gray-600">by {prLink.author}</p>
			</div>

			{checks.length > 0 && (
				<div className="space-y-2">
					<div className="flex items-center gap-4 text-sm">
						<span className="flex items-center gap-1">
							<CheckCircle className="w-4 h-4 text-green-600" />
							{successCount} passed
						</span>
						{failureCount > 0 && (
							<span className="flex items-center gap-1">
								<XCircle className="w-4 h-4 text-red-600" />
								{failureCount} failed
							</span>
						)}
						{pendingCount > 0 && (
							<span className="flex items-center gap-1">
								<Clock className="w-4 h-4 text-yellow-600" />
								{pendingCount} pending
							</span>
						)}
					</div>

					<div className="space-y-1">
						{checks.map((check, index) => (
							<div key={index} className="flex items-center gap-2 text-sm">
								{getStatusIcon(check.status)}
								<span>{check.name}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
