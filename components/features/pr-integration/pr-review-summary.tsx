"use client";

import {
	CheckCircle,
	Clock,
	MessageSquare,
	Users,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { PRStatus } from "@/src/schemas/enhanced-task-schemas";

interface PRReviewSummaryProps {
	prStatus: PRStatus;
	onRequestReview?: (reviewers: string[]) => void | Promise<void>;
	className?: string;
}

export function PRReviewSummary({
	prStatus,
	onRequestReview,
	className = "",
}: PRReviewSummaryProps) {
	const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
	const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
	const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);

	// Mock review comments (in real app, would come from GitHub API)
	const reviewComments = [
		{
			id: "comment-1",
			author: "jane-reviewer",
			body: "Please add more error handling here",
			line: 42,
			file: "src/auth.ts",
		},
	];

	// Mock available reviewers (in real app, would come from team/org data)
	const availableReviewers = [
		"sarah-expert",
		"mike-senior",
		"alex-lead",
		"emma-architect",
	];

	const getReviewerIcon = (status: string) => {
		switch (status) {
			case "approved":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "changes_requested":
				return <XCircle className="h-4 w-4 text-red-500" />;
			case "requested":
				return <Clock className="h-4 w-4 text-yellow-500" />;
			default:
				return <Clock className="h-4 w-4 text-gray-500" />;
		}
	};

	const getReviewerClassName = (status: string) => {
		switch (status) {
			case "approved":
				return "status-approved bg-green-50 border-green-200";
			case "changes_requested":
				return "status-changes-requested bg-red-50 border-red-200";
			case "requested":
				return "status-requested bg-yellow-50 border-yellow-200";
			default:
				return "bg-gray-50 border-gray-200";
		}
	};

	const approvedCount = prStatus.reviewers.filter(
		(r) => r.status === "approved",
	).length;
	const totalReviewers = prStatus.reviewers.length;

	const handleRequestReview = async () => {
		if (selectedReviewers.length === 0 || !onRequestReview) return;

		try {
			await onRequestReview(selectedReviewers);
			setSelectedReviewers([]);
			setIsRequestModalOpen(false);
		} catch (error) {
			console.error("Failed to request review:", error);
		}
	};

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Review Progress Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Users className="h-4 w-4" />
					<h4 className="font-medium text-sm">
						Reviews ({approvedCount}/{totalReviewers})
					</h4>
				</div>

				{onRequestReview && (
					<Dialog
						onOpenChange={setIsRequestModalOpen}
						open={isRequestModalOpen}
					>
						<DialogTrigger asChild>
							<Button size="sm" variant="outline">
								Request Review
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-md">
							<DialogHeader>
								<DialogTitle>Select Reviewers</DialogTitle>
							</DialogHeader>

							<div className="space-y-4">
								<Select
									onValueChange={(value) => {
										if (!selectedReviewers.includes(value)) {
											setSelectedReviewers((prev) => [...prev, value]);
										}
									}}
								>
									<SelectTrigger>
										<SelectValue placeholder="Choose reviewers..." />
									</SelectTrigger>
									<SelectContent>
										{availableReviewers
											.filter(
												(reviewer) => !selectedReviewers.includes(reviewer),
											)
											.map((reviewer) => (
												<SelectItem key={reviewer} value={reviewer}>
													{reviewer}
												</SelectItem>
											))}
									</SelectContent>
								</Select>

								{/* Selected Reviewers */}
								{selectedReviewers.length > 0 && (
									<div className="space-y-2">
										<p className="font-medium text-sm">Selected:</p>
										<div className="flex flex-wrap gap-2">
											{selectedReviewers.map((reviewer) => (
												<Badge
													className="gap-1"
													key={reviewer}
													variant="secondary"
												>
													{reviewer}
													<button
														className="ml-1 hover:text-red-500"
														onClick={() =>
															setSelectedReviewers((prev) =>
																prev.filter((r) => r !== reviewer),
															)
														}
													>
														×
													</button>
												</Badge>
											))}
										</div>
									</div>
								)}

								<div className="flex gap-2 pt-4">
									<Button
										className="flex-1"
										disabled={selectedReviewers.length === 0}
										onClick={handleRequestReview}
									>
										Send Request
									</Button>
									<Button
										className="flex-1"
										onClick={() => setIsRequestModalOpen(false)}
										variant="outline"
									>
										Cancel
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				)}
			</div>

			{/* Reviewers List */}
			<div className="space-y-2">
				{prStatus.reviewers.map((reviewer) => (
					<div
						className={`flex items-center gap-3 rounded-lg border p-2 ${getReviewerClassName(reviewer.status)}`}
						data-testid={`reviewer-${reviewer.login}`}
						key={reviewer.login}
					>
						<Avatar className="h-6 w-6">
							<AvatarFallback className="text-xs">
								{reviewer.login.slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>

						<div className="flex-1">
							<p className="font-medium text-sm">{reviewer.login}</p>
						</div>

						<div className="flex items-center gap-1">
							{getReviewerIcon(reviewer.status)}
							<span className="text-xs capitalize">
								{reviewer.status.replace("_", " ")}
							</span>
						</div>
					</div>
				))}
			</div>

			{/* Review Comments */}
			{reviewComments && reviewComments.length > 0 && (
				<Dialog
					onOpenChange={setIsCommentsModalOpen}
					open={isCommentsModalOpen}
				>
					<DialogTrigger asChild>
						<Button className="w-full gap-2" size="sm" variant="outline">
							<MessageSquare className="h-4 w-4" />
							View Comments ({reviewComments.length})
						</Button>
					</DialogTrigger>
					<DialogContent className="max-h-96 max-w-2xl overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Review Comments</DialogTitle>
						</DialogHeader>

						<div className="space-y-4">
							{reviewComments.map((comment) => (
								<div className="rounded-lg border p-3" key={comment.id}>
									<div className="mb-2 flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Avatar className="h-6 w-6">
												<AvatarFallback className="text-xs">
													{comment.author.slice(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<span className="font-medium text-sm">
												{comment.author}
											</span>
										</div>
										<Badge className="text-xs" variant="outline">
											{comment.file}:{comment.line}
										</Badge>
									</div>
									<p className="text-muted-foreground text-sm">
										{comment.body}
									</p>
								</div>
							))}
						</div>
					</DialogContent>
				</Dialog>
			)}

			{/* Summary Stats */}
			<div className="text-muted-foreground text-xs">
				<p>
					{approvedCount > 0 && `${approvedCount} approved • `}
					{prStatus.reviewers.filter((r) => r.status === "changes_requested")
						.length > 0 &&
						`${prStatus.reviewers.filter((r) => r.status === "changes_requested").length} requested changes • `}
					{prStatus.reviewers.filter((r) => r.status === "requested").length >
						0 &&
						`${prStatus.reviewers.filter((r) => r.status === "requested").length} pending review`}
				</p>
			</div>
		</div>
	);
}
