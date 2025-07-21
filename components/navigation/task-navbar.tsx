"use client";
import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import {
	cancelTaskAction,
	pauseTaskAction,
	resumeTaskAction
} from "@/app/actions/inngest";