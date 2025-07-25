"use client";

import { GitPullRequest, Link, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PRData } from "./pr-status-card";
import { PRStatusCard } from "./pr-status-card";

interface PRLinkingModalProps {
	isOpen: boolean;
	onClose: () => void;
	onLink: (prId: string, taskId: string) => void;
	taskId: string;
	taskTitle: string;
	availablePRs: PRData[];
	linkedPRs: PRData[];
	isLoading?: boolean;
	className?: string;
}

export function PRLinkingModal({
	isOpen,
	onClose,
	onLink,
	taskId,
	taskTitle,
	availablePRs,
	linkedPRs,
	isLoading = false,
	className = "",
}: PRLinkingModalProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredPRs, setFilteredPRs] = useState<PRData[]>([]);
	const [selectedPRs, setSelectedPRs] = useState<Set<string>>(new Set());

	// Filter PRs based on search query
	useEffect(() => {
		const query = searchQuery.toLowerCase();
		const filtered = availablePRs.filter((pr) => {
			// Exclude already linked PRs
			if (linkedPRs.some((linked) => linked.id === pr.id)) {
				return false;
			}

			// Filter by search query
			if (query) {
				return (
					pr.title.toLowerCase().includes(query) ||
					pr.description?.toLowerCase().includes(query) ||
					pr.number.toString().includes(query) ||
					pr.author.toLowerCase().includes(query) ||
					pr.branch.source.toLowerCase().includes(query) ||
					pr.branch.target.toLowerCase().includes(query)
				);
			}

			return true;
		});

		setFilteredPRs(filtered);
	}, [searchQuery, availablePRs, linkedPRs]);

	const handlePRSelect = (prId: string) => {
		const newSelected = new Set(selectedPRs);
		if (newSelected.has(prId)) {
			newSelected.delete(prId);
		} else {
			newSelected.add(prId);
		}
		setSelectedPRs(newSelected);
	};

	const handleLinkSelected = () => {
		selectedPRs.forEach((prId) => {
			onLink(prId, taskId);
		});
		setSelectedPRs(new Set());
		onClose();
	};

	const handleClose = () => {
		setSelectedPRs(new Set());
		setSearchQuery("");
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className={`max-w-4xl max-h-[80vh] overflow-hidden ${className}`}>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link className="h-5 w-5" />
						Link Pull Requests to Task
					</DialogTitle>
					<p className="text-sm text-gray-600">
						Link pull requests to: <strong>{taskTitle}</strong>
					</p>
				</DialogHeader>

				<div className="space-y-4">
					{/* Search */}
					<div className="space-y-2">
						<Label htmlFor="pr-search">Search Pull Requests</Label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								id="pr-search"
								placeholder="Search by title, description, number, author, or branch..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>

					{/* Currently Linked PRs */}
					{linkedPRs.length > 0 && (
						<div className="space-y-2">
							<Label>Currently Linked PRs ({linkedPRs.length})</Label>
							<div className="max-h-32 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded">
								{linkedPRs.map((pr) => (
									<PRStatusCard
										key={pr.id}
										pr={pr}
										compact={true}
										onUnlink={(prId) => {
											// Handle unlinking if needed
											console.log("Unlink PR:", prId);
										}}
									/>
								))}
							</div>
						</div>
					)}

					{/* Available PRs */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label>
								Available PRs ({filteredPRs.length})
								{selectedPRs.size > 0 && (
									<span className="ml-2 text-sm text-blue-600">{selectedPRs.size} selected</span>
								)}
							</Label>
							{selectedPRs.size > 0 && (
								<Button size="sm" onClick={() => setSelectedPRs(new Set())} variant="outline">
									Clear Selection
								</Button>
							)}
						</div>

						<div className="max-h-96 overflow-y-auto space-y-2 border rounded p-2">
							{isLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
									<span className="ml-2 text-gray-600">Loading PRs...</span>
								</div>
							) : filteredPRs.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<GitPullRequest className="h-12 w-12 mx-auto mb-2 opacity-50" />
									<p className="font-medium">No pull requests found</p>
									<p className="text-sm">
										{searchQuery ? "Try adjusting your search query" : "No available PRs to link"}
									</p>
								</div>
							) : (
								filteredPRs.map((pr) => (
									<div
										key={pr.id}
										className={`cursor-pointer transition-all ${
											selectedPRs.has(pr.id)
												? "ring-2 ring-blue-500 bg-blue-50"
												: "hover:bg-gray-50"
										}`}
										onClick={() => handlePRSelect(pr.id)}
									>
										<PRStatusCard pr={pr} compact={true} className="border-0 shadow-none" />
									</div>
								))
							)}
						</div>
					</div>

					{/* Actions */}
					<div className="flex items-center justify-between pt-4 border-t">
						<div className="text-sm text-gray-600">
							{selectedPRs.size > 0 && (
								<span>
									{selectedPRs.size} PR{selectedPRs.size !== 1 ? "s" : ""} selected
								</span>
							)}
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button
								onClick={handleLinkSelected}
								disabled={selectedPRs.size === 0 || isLoading}
								className="flex items-center gap-2"
							>
								<Link className="h-4 w-4" />
								Link {selectedPRs.size > 0 ? `${selectedPRs.size} ` : ""}PR
								{selectedPRs.size !== 1 ? "s" : ""}
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
