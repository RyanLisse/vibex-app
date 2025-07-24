/**
 * General settings tab for alert configuration
 * Extracted from AlertConfigManager to reduce complexity
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type AlertConfig, CriticalErrorType } from "@/lib/alerts";

interface AlertGeneralSettingsProps {
	config: AlertConfig;
	onConfigUpdate: (updates: Partial<AlertConfig>) => void;
}

export function AlertGeneralSettings({ config, onConfigUpdate }: AlertGeneralSettingsProps) {
	const updateRateLimiting = (updates: Partial<AlertConfig["rateLimiting"]>) => {
		onConfigUpdate({
			rateLimiting: { ...config.rateLimiting, ...updates },
		});
	};

	const updateDeduplication = (updates: Partial<AlertConfig["deduplication"]>) => {
		onConfigUpdate({
			deduplication: { ...config.deduplication, ...updates },
		});
	};

	return (
		<div className="space-y-6">
			{/* System Settings */}
			<Card>
				<CardHeader>
					<CardTitle>System Settings</CardTitle>
					<CardDescription>Global alert system configuration</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label htmlFor="enabled">Enable Alert System</Label>
							<p className="text-gray-500 text-sm">Master switch for all alerting</p>
						</div>
						<Switch
							checked={config.enabled}
							id="enabled"
							onCheckedChange={(enabled) => onConfigUpdate({ enabled })}
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<Label htmlFor="maxAlertsPerHour">Max Alerts Per Hour</Label>
							<Input
								id="maxAlertsPerHour"
								onChange={(e) =>
									updateRateLimiting({
										maxAlertsPerHour: Number.parseInt(e.target.value) || 0,
									})
								}
								type="number"
								value={config.rateLimiting.maxAlertsPerHour}
							/>
						</div>

						<div>
							<Label htmlFor="cooldownMinutes">Cooldown Minutes</Label>
							<Input
								id="cooldownMinutes"
								onChange={(e) =>
									updateRateLimiting({
										cooldownMinutes: Number.parseInt(e.target.value) || 0,
									})
								}
								type="number"
								value={config.rateLimiting.cooldownMinutes}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Critical Error Types */}
			<Card>
				<CardHeader>
					<CardTitle>Critical Error Types</CardTitle>
					<CardDescription>Configure which errors trigger immediate alerts</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3">
						{Object.values(CriticalErrorType).map((errorType) => (
							<div key={errorType} className="flex items-center justify-between">
								<div>
									<Label htmlFor={errorType}>{errorType.replace(/_/g, " ")}</Label>
									<p className="text-gray-500 text-sm">
										Alert on {errorType.toLowerCase().replace(/_/g, " ")} errors
									</p>
								</div>
								<Switch
									checked={config.criticalErrorTypes.includes(errorType)}
									id={errorType}
									onCheckedChange={(checked) => {
										const updatedTypes = checked
											? [...config.criticalErrorTypes, errorType]
											: config.criticalErrorTypes.filter((t) => t !== errorType);
										onConfigUpdate({ criticalErrorTypes: updatedTypes });
									}}
								/>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Deduplication */}
			<Card>
				<CardHeader>
					<CardTitle>Deduplication</CardTitle>
					<CardDescription>Prevent duplicate alerts for the same issue</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<Label htmlFor="deduplicationEnabled">Enable Deduplication</Label>
							<p className="text-gray-500 text-sm">Group similar alerts together</p>
						</div>
						<Switch
							checked={config.deduplication.enabled}
							id="deduplicationEnabled"
							onCheckedChange={(enabled) => updateDeduplication({ enabled })}
						/>
					</div>

					{config.deduplication.enabled && (
						<div className="grid gap-4 md:grid-cols-2">
							<div>
								<Label htmlFor="windowMinutes">Window Minutes</Label>
								<Input
									id="windowMinutes"
									onChange={(e) =>
										updateDeduplication({
											windowMinutes: Number.parseInt(e.target.value) || 0,
										})
									}
									type="number"
									value={config.deduplication.windowMinutes}
								/>
							</div>

							<div>
								<Label htmlFor="maxOccurrences">Max Occurrences</Label>
								<Input
									id="maxOccurrences"
									onChange={(e) =>
										updateDeduplication({
											maxOccurrences: Number.parseInt(e.target.value) || 0,
										})
									}
									type="number"
									value={config.deduplication.maxOccurrences}
								/>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Default Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Default Settings</CardTitle>
					<CardDescription>Default values for new alerts</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label htmlFor="defaultPriority">Default Priority</Label>
						<Select
							onValueChange={(value) =>
								onConfigUpdate({
									defaults: {
										...config.defaults,
										priority: value as AlertConfig["defaults"]["priority"],
									},
								})
							}
							value={config.defaults.priority}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="low">Low</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="high">High</SelectItem>
								<SelectItem value="critical">Critical</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label htmlFor="defaultMessage">Default Message Template</Label>
						<Textarea
							id="defaultMessage"
							onChange={(e) =>
								onConfigUpdate({
									defaults: {
										...config.defaults,
										message: e.target.value,
									},
								})
							}
							placeholder="Enter default alert message template..."
							value={config.defaults.message}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
