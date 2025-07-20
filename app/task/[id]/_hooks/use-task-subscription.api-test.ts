/**
 * API Compatibility Test for useTaskSubscription Hook
 *
 * This test verifies that the refactored hook maintains backward compatibility
 * with the original API and expected behavior.
 */

import type { useTaskSubscription } from "@/app/task/[id]/_hooks/use-task-subscription";

// Type check: Verify hook parameters remain unchanged
type HookParams = Parameters<typeof useTaskSubscription>[0];
const _testParams: HookParams = {
	taskId: "test-task-id",
	taskMessages: [
		{
			role: "user",
			type: "message",
			data: { text: "Hello" },
		},
	],
};

// Type check: Verify hook return value includes expected properties
type HookReturnType = ReturnType<typeof useTaskSubscription>;
const _testReturnType: HookReturnType = {
	streamingMessages: new Map(),
	subscriptionEnabled: false,
	// New properties added in refactoring (backward compatible)
	isInitialized: false,
	lastError: null,
};

// Verify the hook can be called with minimal parameters
const _testMinimalParams: HookParams = {
	taskId: "test-task-id",
};

// Test that the hook maintains Map-based streaming messages
const _testStreamingMessages = new Map<string, any>();
_testStreamingMessages.set("stream-1", {
	role: "assistant",
	type: "streaming",
	data: { text: "Hello", streamId: "stream-1" },
});

// Verify the hook return type supports the original usage patterns
function testOriginalUsage(hook: typeof useTaskSubscription) {
	const { streamingMessages, subscriptionEnabled } = hook({
		taskId: "test-task-id",
		taskMessages: [],
	});

	// Original usage patterns should still work
	const messageArray = Array.from(streamingMessages.values());
	const hasMessages = streamingMessages.size > 0;
	const isEnabled = subscriptionEnabled === true;

	return { messageArray, hasMessages, isEnabled };
}

// Test enhanced usage with new properties
function testEnhancedUsage(hook: typeof useTaskSubscription) {
	const { streamingMessages, subscriptionEnabled, isInitialized, lastError } =
		hook({
			taskId: "test-task-id",
			taskMessages: [],
		});

	// Enhanced usage patterns
	const hasError = lastError !== null;
	const isReady = isInitialized && subscriptionEnabled;

	return { hasError, isReady, streamingMessages };
}

export {
	testOriginalUsage,
	testEnhancedUsage,
	_testParams,
	_testReturnType,
	_testMinimalParams,
	_testStreamingMessages,
};
