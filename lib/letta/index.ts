/**
 * Letta Multi-Agent System Integration
 * Central export point for Letta-related functionality
 */

export * from "./agents/brainstorm";
export * from "./agents/orchestrator";
export * from "./client";
export * from "./multi-agent-system";

// Type definitions for Letta integration
export interface LettaAgent {
	id: string;
	name: string;
	description: string;
	capabilities: string[];
	status: "active" | "inactive" | "error";
}

export interface LettaMessage {
	id: string;
	agentId: string;
	content: string;
	timestamp: Date;
	metadata?: Record<string, any>;
}

export interface LettaWorkflow {
	id: string;
	name: string;
	agents: LettaAgent[];
	status: "running" | "paused" | "completed" | "failed";
}

// Basic Letta utilities
export const LETTA_AGENT_TYPES = {
	BRAINSTORM: "brainstorm",
	ORCHESTRATOR: "orchestrator",
	ANALYST: "analyst",
	EXECUTOR: "executor",
} as const;

export type LettaAgentType =
	(typeof LETTA_AGENT_TYPES)[keyof typeof LETTA_AGENT_TYPES];
