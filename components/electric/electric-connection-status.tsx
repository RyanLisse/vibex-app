"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff, AlertCircle } from "lucide-react";

export interface ElectricConnectionStatusProps {
  status: "connected" | "connecting" | "disconnected" | "error";
  className?: string;
}

export function ElectricConnectionStatus({ 
  status, 
  className 
}: ElectricConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          icon: <Wifi className="h-3 w-3" />,
          label: "Connected",
          variant: "default" as const,
          className: "bg-green-100 text-green-800 border-green-200"
        };
      case "connecting":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          label: "Connecting",
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 border-yellow-200"
        };
      case "disconnected":
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: "Disconnected",
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800 border-gray-200"
        };
      case "error":
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Error",
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 border-red-200"
        };
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          label: "Unknown",
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800 border-gray-200"
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ""}`}
    >
      {config.icon}
      <span className="ml-1">{config.label}</span>
    </Badge>
  );
}

export default ElectricConnectionStatus;
