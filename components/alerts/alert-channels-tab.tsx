/**
 * Alert channels tab component
 * Extracted from AlertConfigManager to reduce complexity
 */

import { Edit, Plus, TestTube, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { type AlertChannel, AlertChannelType } from "@/lib/alerts";

interface AlertChannelsTabProps {
  channels: AlertChannel[];
  testing: string | null;
  onToggleChannel: (channelName: string) => void;
  onEditChannel: (channel: AlertChannel) => void;
  onDeleteChannel: (channelName: string) => void;
  onTestChannel: (channelName: string) => void;
  onAddChannel: () => void;
}

export function AlertChannelsTab({
  channels,
  testing,
  onToggleChannel,
  onEditChannel,
  onDeleteChannel,
  onTestChannel,
  onAddChannel,
}: AlertChannelsTabProps) {
  const getChannelTypeColor = (type: AlertChannelType) => {
    switch (type) {
      case AlertChannelType.EMAIL:
        return "bg-blue-100 text-blue-800";
      case AlertChannelType.SLACK:
        return "bg-purple-100 text-purple-800";
      case AlertChannelType.WEBHOOK:
        return "bg-green-100 text-green-800";
      case AlertChannelType.SMS:
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getChannelTypeIcon = (type: AlertChannelType) => {
    // You can add specific icons for each channel type here
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Alert Channels</h3>
          <p className="text-gray-600 text-sm">
            Configure where alerts are sent
          </p>
        </div>
        <Button onClick={onAddChannel}>
          <Plus className="mr-2 h-4 w-4" />
          Add Channel
        </Button>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">
              No alert channels configured. Add a channel to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {channels.map((channel) => (
            <Card key={channel.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getChannelTypeIcon(channel.type)}
                      <CardTitle className="text-base">{channel.name}</CardTitle>
                    </div>
                    <Badge className={getChannelTypeColor(channel.type)}>
                      {channel.type}
                    </Badge>
                    {!channel.enabled && (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={() => onToggleChannel(channel.name)}
                    />
                  </div>
                </div>
                {channel.description && (
                  <CardDescription>{channel.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 text-sm">
                    {channel.type === AlertChannelType.EMAIL && (
                      <p>
                        <span className="font-medium">Recipients:</span>{" "}
                        {channel.config.recipients?.join(", ") || "None"}
                      </p>
                    )}
                    {channel.type === AlertChannelType.SLACK && (
                      <p>
                        <span className="font-medium">Channel:</span>{" "}
                        {channel.config.channel || "Not configured"}
                      </p>
                    )}
                    {channel.type === AlertChannelType.WEBHOOK && (
                      <p>
                        <span className="font-medium">URL:</span>{" "}
                        {channel.config.url ? "Configured" : "Not configured"}
                      </p>
                    )}
                    {channel.type === AlertChannelType.SMS && (
                      <p>
                        <span className="font-medium">Numbers:</span>{" "}
                        {channel.config.phoneNumbers?.length || 0} configured
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={testing === channel.name}
                      onClick={() => onTestChannel(channel.name)}
                      size="sm"
                      variant="outline"
                    >
                      <TestTube className="mr-1 h-3 w-3" />
                      {testing === channel.name ? "Testing..." : "Test"}
                    </Button>
                    <Button
                      onClick={() => onEditChannel(channel)}
                      size="sm"
                      variant="outline"
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => onDeleteChannel(channel.name)}
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Delete
                    </Button>
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
