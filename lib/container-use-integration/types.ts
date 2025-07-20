/**
 * TypeScript types for Container Use Integration with Modal Labs
 * Implements the types defined in the design document for modal functions,
 * git worktrees, task management, and agent coordination.
 */

// Modal Labs Integration Types
export interface ModalFunctionConfig {
  name: string;
  image: string;
  cpu: number;
  memory: number;
  timeout: number;
  secrets: string[];
  mounts: MountConfig[];
  environment: Record<string, string>;
  retries: number;
  concurrency: number;
}

export interface MountConfig {
  local_path: string;
  remote_path: string;
  condition?: string;
}

export interface AgentEnvironment {
  id: string;
  taskId: string;
  modalFunctionId: string;
  status: "initializing" | "ready" | "running" | "completed" | "failed";
  worktreePath: string;
  branchName: string;
  dependencies: string[];
  environmentVariables: Record<string, string>;
  resourceUsage: {
    cpu: number;
    memory: number;
    executionTime: number;
    cost: number;
  };
  logs: LogEntry[];
  createdAt: Date;
  destroyedAt?: Date;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  metadata?: Record<string, unknown>;
}

// Git Worktree Management Types
export interface GitWorktree {
  id: string;
  taskId: string;
  path: string;
  branchName: string;
  baseBranch: string;
  status: "active" | "merged" | "abandoned";
  commits: GitCommit[];
  conflictStatus?: {
    hasConflicts: boolean;
    conflictFiles: string[];
    resolutionStrategy: "auto" | "manual" | "escalate";
  };
  createdAt: Date;
  mergedAt?: Date;
  cleanedUpAt?: Date;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  timestamp: Date;
  files: string[];
}

// Enhanced Task Management Types
export interface Task {
  id: string;
  title: string;
  description: string;
  source: "issue" | "pr_comment" | "voice" | "screenshot" | "manual";
  sourceId: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "queued" | "assigned" | "in_progress" | "completed" | "failed";
  assignedAgent?: string;
  modalFunctionId?: string;
  worktreePath?: string;
  branchName?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

// Multi-Source Task Creation Types
export interface VoiceCommand {
  id: string;
  audioUrl: string;
  transcription: string;
  confidence: number;
  intent: {
    action: "create_task" | "check_status" | "modify_task";
    parameters: Record<string, unknown>;
  };
  taskId?: string;
  processedAt: Date;
  status: "processing" | "completed" | "failed";
}

export interface ScreenshotAnalysis {
  id: string;
  imageUrl: string;
  analysis: {
    detectedIssues: string[];
    suggestedFixes: string[];
    affectedComponents: string[];
    severity: "low" | "medium" | "high";
  };
  taskId?: string;
  processedAt: Date;
  confidence: number;
}

// PR Management Types
export interface AgentPR {
  id: string;
  taskId: string;
  githubPRNumber: number;
  title: string;
  description: string;
  branchName: string;
  status: "draft" | "ready" | "approved" | "merged" | "closed";
  reviewStatus: {
    automated: "pending" | "passed" | "failed";
    human: "pending" | "approved" | "changes_requested";
  };
  ciStatus: {
    tests: "pending" | "passed" | "failed";
    quality: "pending" | "passed" | "failed";
    security: "pending" | "passed" | "failed";
  };
  autoMergeEligible: boolean;
  createdAt: Date;
  mergedAt?: Date;
}

// Agent Communication Types
export interface AgentState {
  id: string;
  taskId: string;
  status: "idle" | "initializing" | "working" | "waiting" | "completed" | "failed";
  currentOperation: string;
  context: Record<string, unknown>;
  memory: Record<string, unknown>;
  performance: {
    tasksCompleted: number;
    averageCompletionTime: number;
    successRate: number;
    lastActiveAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent?: string; // undefined for broadcasts
  type: "status_update" | "task_assignment" | "coordination" | "error";
  payload: Record<string, unknown>;
  timestamp: Date;
}

// API Response Types
export interface ModalFunctionResponse {
  functionId: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: unknown;
  error?: string;
  logs: LogEntry[];
  resourceUsage: AgentEnvironment["resourceUsage"];
}

export interface WorktreeOperationResult {
  success: boolean;
  worktree?: GitWorktree;
  error?: string;
  conflicts?: string[];
}

export interface TaskCreationResult {
  success: boolean;
  task?: Task;
  error?: string;
  warnings?: string[];
}

// Error Types
export interface ContainerUseError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  recoverable: boolean;
}

// Type Guards
export function isTask(obj: unknown): obj is Task {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Task).id === "string" &&
    typeof (obj as Task).title === "string" &&
    typeof (obj as Task).description === "string" &&
    ["issue", "pr_comment", "voice", "screenshot", "manual"].includes(
      (obj as Task).source,
    ) &&
    ["low", "medium", "high", "urgent"].includes((obj as Task).priority) &&
    ["queued", "assigned", "in_progress", "completed", "failed"].includes(
      (obj as Task).status,
    )
  );
}

export function isAgentEnvironment(obj: unknown): obj is AgentEnvironment {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as AgentEnvironment).id === "string" &&
    typeof (obj as AgentEnvironment).taskId === "string" &&
    typeof (obj as AgentEnvironment).modalFunctionId === "string" &&
    ["initializing", "ready", "running", "completed", "failed"].includes(
      (obj as AgentEnvironment).status,
    )
  );
}

export function isGitWorktree(obj: unknown): obj is GitWorktree {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as GitWorktree).id === "string" &&
    typeof (obj as GitWorktree).taskId === "string" &&
    typeof (obj as GitWorktree).path === "string" &&
    typeof (obj as GitWorktree).branchName === "string" &&
    ["active", "merged", "abandoned"].includes((obj as GitWorktree).status)
  );
}

export function isVoiceCommand(obj: unknown): obj is VoiceCommand {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as VoiceCommand).id === "string" &&
    typeof (obj as VoiceCommand).transcription === "string" &&
    typeof (obj as VoiceCommand).confidence === "number" &&
    ["processing", "completed", "failed"].includes(
      (obj as VoiceCommand).status,
    )
  );
}

export function isScreenshotAnalysis(obj: unknown): obj is ScreenshotAnalysis {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as ScreenshotAnalysis).id === "string" &&
    typeof (obj as ScreenshotAnalysis).imageUrl === "string" &&
    typeof (obj as ScreenshotAnalysis).confidence === "number" &&
    typeof (obj as ScreenshotAnalysis).analysis === "object"
  );
}