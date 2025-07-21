/**
 * Enhanced Environments List Component with Real-time Sync
 *
 * Updated to use ElectricSQL real-time synchronization with conflict resolution,
 * offline-first capabilities, and collaborative features.
 */

"use client";

import { Zap, Plus, Settings, ExternalLink } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { SyncIndicator, SyncStatusMonitor } from "@/components/electric/sync-status-monitor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";