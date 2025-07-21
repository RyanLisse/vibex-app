"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	useDebugSession,
	useUserDebugSessions,
} from "@/hooks/use-time-travel-debug";

export default function DebugDemoPage() {
	const { session, isLoading } = useDebugSession("demo-session");
	const { sessions } = useUserDebugSessions();

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">Debug Demo</h1>
				<p className="text-gray-600">Time travel debugging demonstration</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Current Session</CardTitle>
						<CardDescription>Active debug session information</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<p className="text-gray-500">Loading session...</p>
						) : session ? (
							<div className="space-y-2">
								<p>
									<strong>ID:</strong> {session.id}
								</p>
								<p>
									<strong>Status:</strong> {session.status}
								</p>
							</div>
						) : (
							<p className="text-gray-500">No active session</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Session History</CardTitle>
						<CardDescription>Previous debug sessions</CardDescription>
					</CardHeader>
					<CardContent>
						{sessions && sessions.length > 0 ? (
							<div className="space-y-2">
								{sessions.slice(0, 3).map((s) => (
									<div key={s.id} className="text-sm">
										<span className="font-medium">{s.id}</span>
										<span className="ml-2 text-gray-500">{s.status}</span>
									</div>
								))}
							</div>
						) : (
							<p className="text-gray-500">No sessions found</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
