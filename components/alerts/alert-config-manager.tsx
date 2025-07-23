"use client";

import { AlertTriangle, CheckCircle, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertChannelsTab } from "./alert-channels-tab";
import { useAlertConfig } from "./alert-config-hooks";
import { AlertGeneralSettings } from "./alert-general-settings";

interface AlertConfigManagerProps {
	className?: string;
}

export function AlertConfigManager({ className }: AlertConfigManagerProps) {
	const {
		config,
		loading,
		saving,
		testing,
		error,
		success,
		editingChannel,
		isAddingChannel,
		setEditingChannel,
		setIsAddingChannel,
		saveConfig,
		testChannel,
		addChannel,
		updateChannel,
		deleteChannel,
		toggleChannel,
		updateConfig,
	} = useAlertConfig();

	if (loading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
			</div>
		);
	}

	if (!config) {
		return (
			<Alert className="border-red-200 bg-red-50">
				<AlertTriangle className="h-4 w-4" />
				<AlertDescription className="text-red-800">
					Failed to load alert configuration
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className={className}>
			{error && (
				<Alert className="mb-6 border-red-200 bg-red-50">
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription className="text-red-800">{error}</AlertDescription>
				</Alert>
			)}

			{success && (
				<Alert className="mb-6 border-green-200 bg-green-50">
					<CheckCircle className="h-4 w-4" />
					<AlertDescription className="text-green-800">
						{success}
					</AlertDescription>
				</Alert>
			)}

			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="flex items-center gap-2 font-bold text-2xl">
						<Settings className="h-6 w-6" />
						Alert Configuration
					</h2>
					<p className="text-gray-600">
						Manage alert channels and system settings
					</p>
				</div>
				<Button disabled={saving} onClick={saveConfig}>
					{saving ? "Saving..." : "Save Configuration"}
				</Button>
			</div>

			<Tabs className="space-y-6" defaultValue="general">
				<TabsList>
					<TabsTrigger value="general">General Settings</TabsTrigger>
					<TabsTrigger value="channels">Alert Channels</TabsTrigger>
					<TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
				</TabsList>

				<TabsContent value="general">
					<AlertGeneralSettings config={config} onConfigUpdate={updateConfig} />
				</TabsContent>

				<TabsContent value="channels">
					<AlertChannelsTab
						channels={config.channels}
						testing={testing}
						onToggleChannel={toggleChannel}
						onEditChannel={setEditingChannel}
						onDeleteChannel={deleteChannel}
						onTestChannel={testChannel}
						onAddChannel={() => setIsAddingChannel(true)}
					/>
				</TabsContent>

				<TabsContent value="advanced">
					{/* TODO: Create AlertAdvancedSettings component */}
					<div className="text-center py-8 text-gray-500">
						Advanced settings coming soon...
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
