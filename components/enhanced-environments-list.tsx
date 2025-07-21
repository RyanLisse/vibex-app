/**
 * Enhanced Environments List Component with Real-time Sync
 *
 * Updated to use ElectricSQL real-time synchronization with conflict resolution,
 * offline-first capabilities, and collaborative features.
 */

"use client";

import { Zap
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { SyncIndicator,
import { SyncStatusMonitor
} from "@/components/electric/sync-status-monitor";
import { CardTitle
} from "@/components/ui/card";