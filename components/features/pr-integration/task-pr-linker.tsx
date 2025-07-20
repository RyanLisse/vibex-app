"use client";

import { ExternalLink, GitBranch, Link, Search, Unlink } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaskPRLink } from "@/src/schemas/enhanced-task-schemas";

interface TaskPRLinkerProps {
	taskId: string;
	existingLinks?: TaskPRLink[];
	currentBranch?: string;
	onLink: (linkData: {
		taskId: string;
		repository: string;
		prNumber: string;
		autoUpdateStatus: boolean;
	}) => void | Promise<void>;
	onUnlink?: (prId: string) => void | Promise<void>;
	className?: string;
}

interface LinkFormData {
	repository: string;
	prNumber: string;
	autoUpdateStatus: boolean;
}

export function TaskPRLinker({
	taskId,
	existingLinks = [],
	currentBranch,
	onLink,
	onUnlink,
	className = "",
}: TaskPRLinkerProps) {
	const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
	const [isAutoDetecting, setIsAutoDetecting] = useState(false);
	const [linkForm, setLinkForm] = useState<LinkFormData>({
		repository: "",
		prNumber: "",
		autoUpdateStatus: true,
	});
	const [linkError, setLinkError] = useState<string | null>(null);

	const handleAutoDetect = async () => {
		if (!currentBranch) return;

		setIsAutoDetecting(true);
		setLinkError(null);

		try {
			// Mock GitHub API call to find PR by branch
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Simulate finding a PR
			const mockPR = {
				repository: "company/web-app",
				prNumber: "123",
				title: `Feature branch: ${currentBranch}`,
			};

			setLinkForm((prev) => ({
				...prev,
				repository: mockPR.repository,
				prNumber: mockPR.prNumber,
			}));
		} catch (error) {
			setLinkError("No PR found for current branch");
		} finally {
			setIsAutoDetecting(false);
		}
	};

	const handleLinkSubmit = async () => {
		if (!(linkForm.repository && linkForm.prNumber)) {
			setLinkError("Repository and PR number are required");
			return;
		}

		try {
			await onLink({
				taskId,
				repository: linkForm.repository,
				prNumber: linkForm.prNumber,
				autoUpdateStatus: linkForm.autoUpdateStatus,
			});

			// Reset form and close modal
			setLinkForm({
				repository: "",
				prNumber: "",
				autoUpdateStatus: true,
			});
			setIsLinkModalOpen(false);
			setLinkError(null);
		} catch (error) {
			setLinkError("Failed to link PR to task");
		}
	};

	const handleUnlink = async (prId: string) => {
		if (!onUnlink) return;

		try {
			await onUnlink(prId);
		} catch (error) {
			console.error("Failed to unlink PR:", error);
		}
	};

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Existing Links */}
			{existingLinks.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">
							Linked PRs ({existingLinks.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{existingLinks.map((link) => (
								<div
									className="flex items-center justify-between rounded-lg border p-3"
									key={link.prId}
								>
									<div className="flex items-center gap-3">
										<GitBranch className="h-4 w-4 text-blue-500" />
										<div>
											<div className="flex items-center gap-2">
												<span className="font-medium">
													PR #{link.prId.replace("pr-", "")}
												</span>
												<Badge variant="outline">{link.repository}</Badge>
											</div>
											<p className="text-muted-foreground text-sm">
												Branch:{" "}
												<code className="rounded bg-muted px-1 text-xs">
													{link.branch}
												</code>
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2">
										{link.autoUpdateStatus && (
											<Badge className="text-xs" variant="secondary">
												Auto-sync
											</Badge>
										)}

										<Button asChild className="gap-1" size="sm" variant="ghost">
											<a
												href={`https://github.com/${link.repository}/pull/${link.prId.replace("pr-", "")}`}
												rel="noopener noreferrer"
												target="_blank"
											>
												<ExternalLink className="h-3 w-3" />
												View
											</a>
										</Button>

										{onUnlink && (
											<Button
												className="gap-1 text-red-600 hover:text-red-700"
												onClick={() => handleUnlink(link.prId)}
												size="sm"
												variant="ghost"
											>
												<Unlink className="h-3 w-3" />
												Unlink
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Link New PR */}
			<Dialog onOpenChange={setIsLinkModalOpen} open={isLinkModalOpen}>
				<DialogTrigger asChild>
					<Button className="gap-2">
						<Link className="h-4 w-4" />
						Link PR
					</Button>
				</DialogTrigger>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Link Pull Request</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						{linkError && (
							<Alert variant="destructive">
								<AlertDescription>{linkError}</AlertDescription>
							</Alert>
						)}

						{/* Auto-detect */}
						{currentBranch && (
							<div className="space-y-2">
								<p className="text-muted-foreground text-sm">
									Current branch:{" "}
									<code className="rounded bg-muted px-1 text-xs">
										{currentBranch}
									</code>
								</p>
								<Button
									className="w-full gap-2"
									disabled={isAutoDetecting}
									onClick={handleAutoDetect}
									variant="outline"
								>
									{isAutoDetecting ? (
										<>
											<Search className="h-4 w-4 animate-spin" />
											Searching for PR...
										</>
									) : (
										<>
											<Search className="h-4 w-4" />
											Auto-detect PR
										</>
									)}
								</Button>
							</div>
						)}

						{/* Manual Form */}
						<div className="space-y-4">
							<div>
								<Label htmlFor="repository">Repository *</Label>
								<Input
									id="repository"
									onChange={(e) =>
										setLinkForm((prev) => ({
											...prev,
											repository: e.target.value,
										}))
									}
									placeholder="e.g., company/web-app"
									value={linkForm.repository}
								/>
							</div>

							<div>
								<Label htmlFor="prNumber">PR Number *</Label>
								<Input
									id="prNumber"
									onChange={(e) =>
										setLinkForm((prev) => ({
											...prev,
											prNumber: e.target.value,
										}))
									}
									placeholder="e.g., 123"
									value={linkForm.prNumber}
								/>
							</div>

							<div className="flex items-center gap-2">
								<input
									checked={linkForm.autoUpdateStatus}
									id="autoUpdate"
									onChange={(e) =>
										setLinkForm((prev) => ({
											...prev,
											autoUpdateStatus: e.target.checked,
										}))
									}
									type="checkbox"
								/>
								<Label className="text-sm" htmlFor="autoUpdate">
									Automatically update task status when PR is merged
								</Label>
							</div>
						</div>

						{/* Actions */}
						<div className="flex gap-2 pt-4">
							<Button
								className="flex-1"
								disabled={!(linkForm.repository && linkForm.prNumber)}
								onClick={handleLinkSubmit}
							>
								Link PR
							</Button>
							<Button
								className="flex-1"
								onClick={() => {
									setIsLinkModalOpen(false);
									setLinkError(null);
								}}
								variant="outline"
							>
								Cancel
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Help Text */}
			<p className="text-muted-foreground text-xs">
				Link pull requests to automatically sync status updates and track code
				review progress.
			</p>
		</div>
	);
}
