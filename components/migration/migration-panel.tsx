/**
 * Migration Panel Component
 *
 * Comprehensive UI for managing localStorage to database migration.
 * Provides real-time progress tracking, conflict resolution, and backup management.
 */

"use client";
import { AlertTriangle, Zap } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { CardTitle } from "@/components/ui/card";
import { MigrationState } from "@/lib/migration/types";
