"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaskPRLink } from "@/src/schemas/enhanced-task-schemas";

interface TaskPRLinkerProps {
	taskId: string;
	onLink: (prUrl: string) => void;
	existingLinks?: TaskPRLink[];
}

export function TaskPRLinker({ taskId, onLink, existingLinks = [] }: TaskPRLinkerProps) {
	const [prUrl, setPrUrl] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!prUrl.trim()) return;

		setIsLoading(true);
		try {
			await onLink(prUrl.trim());
			setPrUrl("");
		} finally {
			setIsLoading(false);
		}
	};

	const isValidGitHubPR = (url: string) => {
		return url.includes("github.com") && url.includes("/pull/");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm">Link Pull Request</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<form onSubmit={handleSubmit} className="space-y-3">
					<div>
						<Label htmlFor="pr-url">GitHub PR URL</Label>
						<Input
							id="pr-url"
							type="url"
							value={prUrl}
							onChange={(e) => setPrUrl(e.target.value)}
							placeholder="https://github.com/owner/repo/pull/123"
							required
						/>
					</div>
					<Button
						type="submit"
						disabled={isLoading || !prUrl.trim() || !isValidGitHubPR(prUrl)}
						size="sm"
					>
						{isLoading ? "Linking..." : "Link PR"}
					</Button>
				</form>

				{existingLinks.length > 0 && (
					<div className="space-y-2">
						<h4 className="text-sm font-medium">Linked PRs</h4>
						{existingLinks.map((link) => (
							<div key={link.prUrl} className="flex items-center justify-between text-sm">
								<span>PR #{link.prNumber}</span>
								<a
									href={link.prUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:text-blue-800"
								>
									View →
								</a>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
