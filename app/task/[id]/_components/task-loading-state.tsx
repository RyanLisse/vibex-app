"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TaskLoadingStateProps {
	showHeader?: boolean;
	showMessages?: boolean;
	messageCount?: number;
}

export function TaskLoadingState({
	showHeader = true,
	showMessages = true,
	messageCount = 3,
}: TaskLoadingStateProps) {
	return (
		<div className="space-y-4">
			{showHeader && (
				<Card>
					<CardHeader className="space-y-2">
						<Skeleton className="h-6 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6 mt-2" />
					</CardContent>
				</Card>
			)}

			{showMessages && (
				<div className="space-y-3">
					{Array.from({ length: messageCount }).map((_, index) => (
						<Card key={index}>
							<CardContent className="p-4">
								<div className="flex items-start space-x-3">
									<Skeleton className="h-8 w-8 rounded-full" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-4/5" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
