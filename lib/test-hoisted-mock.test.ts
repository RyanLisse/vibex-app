import { describe, expect, it, vi } from "vitest";

// This is what's failing - hoisted vi.mock
// Bun doesn't support vi.mock yet
// vi.mock('./some-module', () => ({
//   default: () => 'mocked',
// }));

describe.skip("Hoisted Mock Test", () => {
	it("should test if hoisted vi.mock works", () => {
		expect(true).toBe(true);
	});
});
