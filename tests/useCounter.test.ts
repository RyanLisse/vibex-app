import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useCounter } from "./useCounter";

describe.skip("useCounter", () => {
	it("should initialize with default values", () => {
		const { result } = renderHook(() => useCounter());
		expect(result.current).toBeDefined();
	});
});
