"use client";

import {
	Activity,
	ArrowRight,
	Brain,
	Lightbulb,
	Mic,
	MicOff,
	Pause,
	Play,
	Sparkles,
	Volume2,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VoiceBrainstormProps {
	onIdeasGenerated?: (ideas: string[]) => void;
	className?: string;
}

export const VoiceBrainstorm = React.memo(function VoiceBrainstorm({
	onIdeasGenerated,
	className,
}: VoiceBrainstormProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [ideas, setIdeas] = useState<string[]>([]);

	const toggleRecording = useCallback(() => {
		setIsRecording((prev) => !prev);
		// TODO: Implement actual voice recording and brainstorming logic
	}, []);

	const ideasList = useMemo(
		() =>
			ideas.map((idea, index) => (
				<div key={index} className="p-2 bg-muted rounded-md">
					{idea}
				</div>
			)),
		[ideas],
	);

	const emptyState = useMemo(
		() => (
			<div className="text-center text-muted-foreground py-8">
				<Lightbulb className="h-12 w-12 mx-auto mb-2 opacity-50" />
				<p>Start recording to generate ideas</p>
			</div>
		),
		[],
	);

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Brain className="h-5 w-5" />
					Voice Brainstorm
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<Button
						onClick={toggleRecording}
						variant={isRecording ? "destructive" : "default"}
						className="w-full"
					>
						{isRecording ? (
							<>
								<MicOff className="h-4 w-4 mr-2" />
								Stop Recording
							</>
						) : (
							<>
								<Mic className="h-4 w-4 mr-2" />
								Start Brainstorming
							</>
						)}
					</Button>

					{ideas.length > 0 ? (
						<div className="space-y-2">
							<h3 className="font-semibold">Generated Ideas:</h3>
							{ideasList}
						</div>
					) : (
						emptyState
					)}
				</div>
			</CardContent>
		</Card>
	);
});
