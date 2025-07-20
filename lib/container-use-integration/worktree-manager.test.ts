/**
 * Test suite for Git worktree manager
 * Tests the core functionality for creating, managing, and cleaning up
 * Git worktrees for parallel agent development.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { GitWorktreeManager } from "./worktree-manager";
import type {
  GitWorktree,
  WorktreeOperationResult,
  GitCommit,
  ContainerUseError,
} from "./types";

describe("GitWorktreeManager", () => {
  let worktreeManager: GitWorktreeManager;

  beforeEach(() => {
    worktreeManager = new GitWorktreeManager({
      repositoryPath: "/tmp/test-repo",
      baseBranch: "main",
      worktreeBaseDir: "/tmp/worktrees",
    });
  });

  describe("createWorktree", () => {
    test("should create a new worktree for task", async () => {
      // This test will fail initially (RED phase)
      const taskId = "task-123";
      const branchName = "feature/task-123";

      const result = await worktreeManager.createWorktree(taskId, branchName);

      expect(result.success).toBe(true);
      expect(result.worktree).toBeDefined();
      expect(result.worktree?.taskId).toBe(taskId);
      expect(result.worktree?.branchName).toBe(branchName);
      expect(result.worktree?.status).toBe("active");
      expect(result.worktree?.path).toContain(taskId);
    });

    test("should handle worktree creation with custom base branch", async () => {
      const taskId = "task-feature";
      const branchName = "feature/new-feature";
      const baseBranch = "develop";

      const result = await worktreeManager.createWorktree(
        taskId,
        branchName,
        { baseBranch },
      );

      expect(result.success).toBe(true);
      expect(result.worktree?.baseBranch).toBe(baseBranch);
    });

    test("should fail when branch already exists", async () => {
      const taskId = "task-duplicate";
      const branchName = "feature/existing-branch";

      // First creation should succeed
      const firstResult = await worktreeManager.createWorktree(
        taskId,
        branchName,
      );
      expect(firstResult.success).toBe(true);

      // Second creation with same branch should fail
      const secondResult = await worktreeManager.createWorktree(
        `${taskId}-2`,
        branchName,
      );
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain("branch already exists");
    });

    test("should create worktree directory structure", async () => {
      const taskId = "task-structure";
      const branchName = "feature/task-structure";

      const result = await worktreeManager.createWorktree(taskId, branchName);

      expect(result.success).toBe(true);
      expect(result.worktree?.path).toMatch(/worktrees.*task-structure/);
    });
  });

  describe("switchToWorktree", () => {
    test("should switch to existing worktree", async () => {
      const worktreeId = "wt-123";

      const result = await worktreeManager.switchToWorktree(worktreeId);

      expect(result.success).toBe(true);
      expect(result.currentWorktree).toBeDefined();
      expect(result.currentWorktree?.id).toBe(worktreeId);
    });

    test("should fail when switching to nonexistent worktree", async () => {
      const nonexistentId = "wt-nonexistent";

      const result = await worktreeManager.switchToWorktree(nonexistentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain("worktree not found");
    });
  });

  describe("commitChanges", () => {
    test("should commit changes in worktree", async () => {
      const worktreeId = "wt-commit";
      const commitMessage = "Add new feature implementation";
      const files = ["src/feature.ts", "tests/feature.test.ts"];

      const result = await worktreeManager.commitChanges(
        worktreeId,
        commitMessage,
        files,
      );

      expect(result.success).toBe(true);
      expect(result.commit).toBeDefined();
      expect(result.commit?.message).toBe(commitMessage);
      expect(result.commit?.files).toEqual(files);
      expect(result.commit?.hash).toMatch(/^[a-f0-9]{40}$/);
    });

    test("should handle empty commits", async () => {
      const worktreeId = "wt-empty";
      const commitMessage = "Empty commit";

      const result = await worktreeManager.commitChanges(
        worktreeId,
        commitMessage,
        [],
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("no changes to commit");
    });

    test("should auto-stage files when not specified", async () => {
      const worktreeId = "wt-auto-stage";
      const commitMessage = "Auto-staged commit";

      const result = await worktreeManager.commitChanges(
        worktreeId,
        commitMessage,
      );

      expect(result.success).toBe(true);
      expect(result.commit?.files.length).toBeGreaterThan(0);
    });
  });

  describe("detectConflicts", () => {
    test("should detect merge conflicts", async () => {
      const worktreeId = "wt-conflict";

      const conflicts = await worktreeManager.detectConflicts(worktreeId);

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts).toHaveProperty("length");
    });

    test("should identify specific conflict files", async () => {
      const worktreeId = "wt-conflict-files";

      // Simulate conflicting changes
      await worktreeManager.commitChanges(
        worktreeId,
        "Conflicting change",
        ["package.json"],
      );

      const conflicts = await worktreeManager.detectConflicts(worktreeId);

      if (conflicts.length > 0) {
        expect(conflicts[0]).toHaveProperty("file");
        expect(conflicts[0]).toHaveProperty("type");
        expect(conflicts[0]).toHaveProperty("description");
      }
    });
  });

  describe("resolveConflicts", () => {
    test("should automatically resolve simple conflicts", async () => {
      const worktreeId = "wt-resolve";
      const conflicts = [
        {
          file: "package.json",
          type: "dependency" as const,
          strategy: "merge" as const,
        },
      ];

      const result = await worktreeManager.resolveConflicts(
        worktreeId,
        conflicts,
      );

      expect(result.success).toBe(true);
      expect(result.resolvedConflicts).toBeGreaterThan(0);
    });

    test("should escalate complex conflicts", async () => {
      const worktreeId = "wt-escalate";
      const complexConflicts = [
        {
          file: "src/core.ts",
          type: "logic" as const,
          strategy: "manual" as const,
        },
      ];

      const result = await worktreeManager.resolveConflicts(
        worktreeId,
        complexConflicts,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("manual intervention required");
      expect(result.escalatedConflicts).toBeGreaterThan(0);
    });
  });

  describe("mergeToMain", () => {
    test("should merge worktree to main branch", async () => {
      const worktreeId = "wt-merge";

      const result = await worktreeManager.mergeToMain(worktreeId);

      expect(result.success).toBe(true);
      expect(result.mergeCommit).toBeDefined();
      expect(result.mergeCommit?.message).toContain("Merge");
    });

    test("should handle merge conflicts during merge", async () => {
      const worktreeId = "wt-merge-conflict";

      const result = await worktreeManager.mergeToMain(worktreeId);

      if (!result.success) {
        expect(result.conflicts).toBeDefined();
        expect(result.conflicts?.length).toBeGreaterThan(0);
      }
    });

    test("should create pull request instead of direct merge when configured", async () => {
      const worktreeId = "wt-pr";

      const result = await worktreeManager.mergeToMain(worktreeId, {
        createPR: true,
        prTitle: "Automated merge from agent",
      });

      expect(result.success).toBe(true);
      expect(result.pullRequest).toBeDefined();
      expect(result.pullRequest?.title).toBe("Automated merge from agent");
    });
  });

  describe("cleanupWorktree", () => {
    test("should cleanup worktree and remove directory", async () => {
      const worktreeId = "wt-cleanup";

      const result = await worktreeManager.cleanupWorktree(worktreeId);

      expect(result.success).toBe(true);
      expect(result.removedFiles).toBeGreaterThanOrEqual(0);
      expect(result.freedSpace).toBeGreaterThanOrEqual(0);
    });

    test("should backup uncommitted changes before cleanup", async () => {
      const worktreeId = "wt-backup";

      const result = await worktreeManager.cleanupWorktree(worktreeId, {
        backupUncommitted: true,
      });

      expect(result.success).toBe(true);
      if (result.hasUncommittedChanges) {
        expect(result.backupLocation).toBeDefined();
      }
    });

    test("should force cleanup when normal cleanup fails", async () => {
      const worktreeId = "wt-force";

      const result = await worktreeManager.cleanupWorktree(worktreeId, {
        force: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("listWorktrees", () => {
    test("should list all active worktrees", async () => {
      const worktrees = await worktreeManager.listWorktrees();

      expect(worktrees).toBeInstanceOf(Array);
      worktrees.forEach((worktree) => {
        expect(worktree).toHaveProperty("id");
        expect(worktree).toHaveProperty("taskId");
        expect(worktree).toHaveProperty("path");
        expect(worktree).toHaveProperty("branchName");
        expect(worktree).toHaveProperty("status");
      });
    });

    test("should filter worktrees by status", async () => {
      const activeWorktrees = await worktreeManager.listWorktrees({
        status: "active",
      });

      activeWorktrees.forEach((worktree) => {
        expect(worktree.status).toBe("active");
      });
    });

    test("should filter worktrees by task ID", async () => {
      const taskId = "task-filter";
      const taskWorktrees = await worktreeManager.listWorktrees({ taskId });

      taskWorktrees.forEach((worktree) => {
        expect(worktree.taskId).toBe(taskId);
      });
    });
  });

  describe("getWorktreeStatus", () => {
    test("should get detailed status of worktree", async () => {
      const worktreeId = "wt-status";

      const status = await worktreeManager.getWorktreeStatus(worktreeId);

      expect(status).toHaveProperty("worktree");
      expect(status).toHaveProperty("gitStatus");
      expect(status).toHaveProperty("uncommittedFiles");
      expect(status).toHaveProperty("ahead");
      expect(status).toHaveProperty("behind");
    });

    test("should include conflict information in status", async () => {
      const worktreeId = "wt-status-conflict";

      const status = await worktreeManager.getWorktreeStatus(worktreeId);

      expect(status).toHaveProperty("conflicts");
      expect(status.conflicts).toBeInstanceOf(Array);
    });
  });

  describe("performance optimization", () => {
    test("should optimize worktree creation for large repositories", async () => {
      const taskId = "task-large-repo";
      const branchName = "feature/large-repo-test";

      const startTime = Date.now();
      const result = await worktreeManager.createWorktree(taskId, branchName, {
        shallow: true,
        depth: 1,
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete in < 10s
    });

    test("should use worktree pooling for similar tasks", async () => {
      const taskIds = ["task-pool-1", "task-pool-2", "task-pool-3"];
      const results = await Promise.all(
        taskIds.map((taskId) =>
          worktreeManager.createWorktree(taskId, `feature/${taskId}`, {
            reusePool: true,
          }),
        ),
      );

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Verify pool efficiency
      const poolStats = await worktreeManager.getPoolStats();
      expect(poolStats.reuseRate).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    test("should handle Git operation failures gracefully", async () => {
      const taskId = "task-git-fail";
      const branchName = "feature/invalid-characters-@#$%";

      const result = await worktreeManager.createWorktree(taskId, branchName);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should recover from corrupted worktree state", async () => {
      const worktreeId = "wt-corrupted";

      const result = await worktreeManager.recoverWorktree(worktreeId);

      expect(result.success).toBe(true);
      expect(result.recoveryActions).toBeInstanceOf(Array);
    });

    test("should handle disk space issues", async () => {
      const taskId = "task-no-space";
      const branchName = "feature/no-space";

      // Mock disk space check to return insufficient space
      const result = await worktreeManager.createWorktree(taskId, branchName);

      if (!result.success && result.error?.includes("disk space")) {
        expect(result.error).toContain("insufficient disk space");
      }
    });
  });
});