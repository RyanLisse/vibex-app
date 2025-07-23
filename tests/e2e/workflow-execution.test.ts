/**
 * End-to-End Workflow Execution Tests
 *
 * Tests complete user workflows including task management,
 * agent memory, and real-time synchronization.
 */

import { expect, test } from "@playwright/test";

test.describe("Workflow Execution", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the application
		await page.goto("/");
	});

	test("should complete task creation and management workflow", async ({ page }) => {
		// Navigate to tasks page
		await page.click('[data-testid="tasks-nav"]');
		await expect(page).toHaveURL(/.*tasks/);

		// Create a new task
		await page.click('[data-testid="create-task-button"]');
		await page.fill('[data-testid="task-title-input"]', "E2E Test Task");
		await page.fill('[data-testid="task-description-input"]', "This is an end-to-end test task");
		await page.selectOption('[data-testid="task-priority-select"]', "high");
		await page.click('[data-testid="create-task-submit"]');

		// Verify task appears in the list
		await expect(page.locator('[data-testid="task-list"]')).toContainText("E2E Test Task");
		await expect(page.locator('[data-testid="task-priority-badge"]')).toContainText("high");

		// Update task status
		await page.click('[data-testid="task-menu-button"]');
		await page.click('[data-testid="task-start-action"]');

		// Verify status update
		await expect(page.locator('[data-testid="task-status-badge"]')).toContainText("in-progress");

		// Complete the task
		await page.click('[data-testid="task-menu-button"]');
		await page.click('[data-testid="task-complete-action"]');

		// Verify completion
		await expect(page.locator('[data-testid="task-status-badge"]')).toContainText("completed");
	});

	test("should handle environment management workflow", async ({ page }) => {
		// Navigate to environments page
		await page.click('[data-testid="environments-nav"]');
		await expect(page).toHaveURL(/.*environments/);

		// Create a new environment
		await page.click('[data-testid="create-environment-button"]');
		await page.fill('[data-testid="environment-name-input"]', "E2E Test Environment");
		await page.fill(
			'[data-testid="environment-config-input"]',
			'{"type": "test", "version": "1.0"}'
		);
		await page.click('[data-testid="create-environment-submit"]');

		// Verify environment appears in the list
		await expect(page.locator('[data-testid="environment-list"]')).toContainText(
			"E2E Test Environment"
		);

		// Activate the environment
		await page.click('[data-testid="environment-menu-button"]');
		await page.click('[data-testid="environment-activate-action"]');

		// Verify activation
		await expect(page.locator('[data-testid="environment-status-badge"]')).toContainText("Active");
	});

	test("should demonstrate agent memory functionality", async ({ page }) => {
		// Navigate to agent memory page
		await page.goto("/agent-memory");
		await expect(page).toHaveURL(/.*agent-memory/);

		// Load sample memories
		await page.click('[data-testid="load-sample-memories"]');
		await expect(page.locator('[data-testid="success-alert"]')).toBeVisible();

		// Search for memories
		await page.fill('[data-testid="memory-search-input"]', "best practices");
		await page.waitForTimeout(500); // Wait for debounced search

		// Verify search results
		await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
		await expect(page.locator('[data-testid="search-result-item"]')).toHaveCount.greaterThan(0);

		// View memory details
		await page.click('[data-testid="search-result-item"]').first();
		await expect(page.locator('[data-testid="memory-details"]')).toBeVisible();

		// Test context retrieval
		await page.click('[data-testid="context-tab"]');
		await page.fill('[data-testid="task-description-input"]', "Implement a new React component");

		// Verify context is loaded
		await expect(page.locator('[data-testid="context-summary"]')).toBeVisible();
		await expect(page.locator('[data-testid="relevant-memories"]')).toBeVisible();
	});

	test("should handle real-time updates", async ({ page, context }) => {
		// Open two pages to test real-time sync
		const page1 = page;
		const page2 = await context.newPage();

		// Navigate both pages to tasks
		await page1.goto("/tasks");
		await page2.goto("/tasks");

		// Create a task on page1
		await page1.click('[data-testid="create-task-button"]');
		await page1.fill('[data-testid="task-title-input"]', "Real-time Test Task");
		await page1.click('[data-testid="create-task-submit"]');

		// Verify the task appears on page2 (real-time sync)
		await expect(page2.locator('[data-testid="task-list"]')).toContainText("Real-time Test Task", {
			timeout: 5000,
		});

		// Update task status on page2
		await page2.click('[data-testid="task-menu-button"]').first();
		await page2.click('[data-testid="task-start-action"]');

		// Verify status update appears on page1
		await expect(page1.locator('[data-testid="task-status-badge"]')).toContainText("in-progress", {
			timeout: 5000,
		});

		await page2.close();
	});

	test("should handle error scenarios gracefully", async ({ page }) => {
		// Test network error handling
		await page.route("**/api/tasks", (route) => {
			route.abort("failed");
		});

		await page.goto("/tasks");

		// Verify error message is displayed
		await expect(page.locator('[data-testid="error-alert"]')).toBeVisible();
		await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

		// Test retry functionality
		await page.unroute("**/api/tasks");
		await page.click('[data-testid="retry-button"]');

		// Verify error is cleared and data loads
		await expect(page.locator('[data-testid="error-alert"]')).not.toBeVisible();
		await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
	});

	test("should demonstrate performance with large datasets", async ({ page }) => {
		// Navigate to performance test page
		await page.goto("/test/performance");

		// Load large dataset
		await page.click('[data-testid="load-large-dataset"]');

		// Measure loading time
		const startTime = Date.now();
		await expect(page.locator('[data-testid="dataset-loaded"]')).toBeVisible({ timeout: 10000 });
		const loadTime = Date.now() - startTime;

		// Verify performance is acceptable
		expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

		// Test search performance
		const searchStartTime = Date.now();
		await page.fill('[data-testid="search-input"]', "performance test");
		await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
		const searchTime = Date.now() - searchStartTime;

		expect(searchTime).toBeLessThan(1000); // Search should complete within 1 second

		// Test pagination
		await page.click('[data-testid="next-page-button"]');
		await expect(page.locator('[data-testid="page-indicator"]')).toContainText("Page 2");
	});

	test("should handle offline scenarios", async ({ page, context }) => {
		// Navigate to tasks page
		await page.goto("/tasks");
		await expect(page.locator('[data-testid="task-list"]')).toBeVisible();

		// Simulate offline mode
		await context.setOffline(true);

		// Try to create a task while offline
		await page.click('[data-testid="create-task-button"]');
		await page.fill('[data-testid="task-title-input"]', "Offline Task");
		await page.click('[data-testid="create-task-submit"]');

		// Verify offline indicator
		await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

		// Verify task is queued for sync
		await expect(page.locator('[data-testid="sync-queue-indicator"]')).toContainText("1 pending");

		// Go back online
		await context.setOffline(false);

		// Verify sync occurs
		await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
		await expect(page.locator('[data-testid="sync-queue-indicator"]')).toContainText("0 pending");
		await expect(page.locator('[data-testid="task-list"]')).toContainText("Offline Task");
	});

	test("should complete workflow orchestration", async ({ page }) => {
		// Navigate to workflows page
		await page.goto("/workflows");

		// Create a new workflow
		await page.click('[data-testid="create-workflow-button"]');
		await page.fill('[data-testid="workflow-name-input"]', "E2E Test Workflow");
		await page.fill('[data-testid="workflow-description-input"]', "End-to-end test workflow");

		// Add workflow steps
		await page.click('[data-testid="add-step-button"]');
		await page.selectOption('[data-testid="step-type-select"]', "action");
		await page.fill('[data-testid="step-name-input"]', "Initialize");
		await page.click('[data-testid="save-step-button"]');

		await page.click('[data-testid="add-step-button"]');
		await page.selectOption('[data-testid="step-type-select"]', "condition");
		await page.fill('[data-testid="step-name-input"]', "Check Status");
		await page.click('[data-testid="save-step-button"]');

		// Save workflow
		await page.click('[data-testid="save-workflow-button"]');
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

		// Execute workflow
		await page.click('[data-testid="execute-workflow-button"]');
		await expect(page.locator('[data-testid="workflow-status"]')).toContainText("running");

		// Monitor execution progress
		await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible();
		await expect(page.locator('[data-testid="current-step"]')).toContainText("Initialize");

		// Wait for completion
		await expect(page.locator('[data-testid="workflow-status"]')).toContainText("completed", {
			timeout: 30000,
		});
	});

	test("should demonstrate time-travel debugging", async ({ page }) => {
		// Navigate to time-travel debug page
		await page.goto("/time-travel-debug");

		// Select an execution to debug
		await page.click('[data-testid="execution-select"]');
		await page.click('[data-testid="execution-option"]').first();

		// Verify timeline is loaded
		await expect(page.locator('[data-testid="execution-timeline"]')).toBeVisible();
		await expect(page.locator('[data-testid="timeline-step"]')).toHaveCount.greaterThan(0);

		// Navigate through execution steps
		await page.click('[data-testid="timeline-step"]').first();
		await expect(page.locator('[data-testid="step-details"]')).toBeVisible();
		await expect(page.locator('[data-testid="step-state"]')).toBeVisible();

		// Test replay functionality
		await page.click('[data-testid="replay-button"]');
		await expect(page.locator('[data-testid="replay-controls"]')).toBeVisible();

		// Step through replay
		await page.click('[data-testid="step-forward-button"]');
		await expect(page.locator('[data-testid="current-step-indicator"]')).toContainText("Step 2");

		// Test comparison
		await page.click('[data-testid="compare-button"]');
		await page.click('[data-testid="comparison-execution-select"]');
		await page.click('[data-testid="comparison-execution-option"]').first();

		await expect(page.locator('[data-testid="execution-comparison"]')).toBeVisible();
		await expect(page.locator('[data-testid="diff-viewer"]')).toBeVisible();
	});

	test("should handle accessibility requirements", async ({ page }) => {
		// Navigate to main page
		await page.goto("/");

		// Test keyboard navigation
		await page.keyboard.press("Tab");
		await expect(page.locator(":focus")).toBeVisible();

		// Test ARIA labels
		const createButton = page.locator('[data-testid="create-task-button"]');
		await expect(createButton).toHaveAttribute("aria-label");

		// Test screen reader compatibility
		const headings = page.locator("h1, h2, h3, h4, h5, h6");
		await expect(headings.first()).toBeVisible();

		// Test color contrast (would need additional tooling in real implementation)
		// This is a placeholder for accessibility testing
		const buttons = page.locator("button");
		await expect(buttons.first()).toBeVisible();
	});
});
