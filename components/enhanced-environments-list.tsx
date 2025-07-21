/**
 * Enhanced Environments List Component with Real-time Sync
 *
 * Updated to use ElectricSQL real-time synchronization with conflict resolution,
 * offline-first capabilities, and collaborative features.
 */

"use client";

import { ExternalLink, Plus, Settings, Zap } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
	SyncIndicator,
	SyncStatusMonitor,
} from "@/components/electric/sync-status-monitor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
