"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface ChatLoadingStateProps {
	messageCount?: number;
}

export function ChatLoadingState({ messageCount = 1 }: ChatLoadingStateProps) {
	return (
		<div className="space-y-3">
			{Array.from({ length: messageCount }).map((_, index) => (
				<div key={index} className="flex gap-3">
					<Skeleton className="h-8 w-8 rounded-full shrink-0" />
					<Card className="flex-1 max-w-[80%]">
						<CardContent className="p-3">
							<Skeleton className="h-4 w-full mb-2" />
							<Skeleton className="h-4 w-3/4 mb-2" />
							<Skeleton className="h-4 w-1/2" />
						</CardContent>
					</Card>
				</div>
			))}
		</div>
	);
}
