import { describe, expect, it } from "vitest";
import {
	isLatestDataType,
	isStatusData,
	isUpdateData,
	type LatestData,
	type StatusData,
	type UpdateData,
} from "./container-types";

describe("container-types type guards", () => {
	describe("isStatusData", () => {
		it("should return true for valid StatusData", () => {
			const validStatus: StatusData = {
				status: "running",
				containerId: "abc123",
				timestamp: new Date().toISOString(),
			};

			expect(isStatusData(validStatus)).toBe(true);
		});

		it("should return true for StatusData with optional fields", () => {
			const statusWithOptionals: StatusData = {
				status: "stopped",
				containerId: "def456",
				timestamp: new Date().toISOString(),
				exitCode: 0,
				error: null,
			};

			expect(isStatusData(statusWithOptionals)).toBe(true);
		});

		it("should return false for invalid StatusData - missing required fields", () => {
			const invalidStatus = {
				status: "running",
				// missing containerId and timestamp
			};

			expect(isStatusData(invalidStatus)).toBe(false);
		});

		it("should return false for invalid StatusData - wrong types", () => {
			const invalidStatus = {
				status: 123, // should be string
				containerId: "abc123",
				timestamp: new Date().toISOString(),
			};

			expect(isStatusData(invalidStatus)).toBe(false);
		});

		it("should return false for null/undefined", () => {
			expect(isStatusData(null)).toBe(false);
			expect(isStatusData(undefined)).toBe(false);
		});
	});

	describe("isUpdateData", () => {
		it("should return true for valid UpdateData", () => {
			const validUpdate: UpdateData = {
				type: "config",
				containerId: "abc123",
				timestamp: new Date().toISOString(),
				data: { setting: "value" },
			};

			expect(isUpdateData(validUpdate)).toBe(true);
		});

		it("should return true for UpdateData with different types", () => {
			const logUpdate: UpdateData = {
				type: "logs",
				containerId: "def456",
				timestamp: new Date().toISOString(),
				data: ["log line 1", "log line 2"],
			};

			expect(isUpdateData(logUpdate)).toBe(true);
		});

		it("should return false for invalid UpdateData - missing required fields", () => {
			const invalidUpdate = {
				type: "config",
				// missing containerId, timestamp, and data
			};

			expect(isUpdateData(invalidUpdate)).toBe(false);
		});

		it("should return false for invalid UpdateData - wrong types", () => {
			const invalidUpdate = {
				type: 123, // should be string
				containerId: "abc123",
				timestamp: new Date().toISOString(),
				data: { setting: "value" },
			};

			expect(isUpdateData(invalidUpdate)).toBe(false);
		});

		it("should return false for null/undefined", () => {
			expect(isUpdateData(null)).toBe(false);
			expect(isUpdateData(undefined)).toBe(false);
		});
	});

	describe("isLatestDataType", () => {
		it("should return true for valid LatestData", () => {
			const validLatest: LatestData = {
				containerId: "abc123",
				lastStatus: "running",
				lastUpdate: new Date().toISOString(),
				version: "1.0.0",
			};

			expect(isLatestDataType(validLatest)).toBe(true);
		});

		it("should return true for LatestData with optional fields", () => {
			const latestWithOptionals: LatestData = {
				containerId: "def456",
				lastStatus: "stopped",
				lastUpdate: new Date().toISOString(),
				version: "2.1.0",
				metadata: { tags: ["production"] },
				health: "healthy",
			};

			expect(isLatestDataType(latestWithOptionals)).toBe(true);
		});

		it("should return false for invalid LatestData - missing required fields", () => {
			const invalidLatest = {
				containerId: "abc123",
				// missing lastStatus, lastUpdate, and version
			};

			expect(isLatestDataType(invalidLatest)).toBe(false);
		});

		it("should return false for invalid LatestData - wrong types", () => {
			const invalidLatest = {
				containerId: 123, // should be string
				lastStatus: "running",
				lastUpdate: new Date().toISOString(),
				version: "1.0.0",
			};

			expect(isLatestDataType(invalidLatest)).toBe(false);
		});

		it("should return false for null/undefined", () => {
			expect(isLatestDataType(null)).toBe(false);
			expect(isLatestDataType(undefined)).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should handle objects with extra properties", () => {
			const statusWithExtra = {
				status: "running",
				containerId: "abc123",
				timestamp: new Date().toISOString(),
				extraProperty: "should be ignored",
			};

			expect(isStatusData(statusWithExtra)).toBe(true);
		});

		it("should handle empty objects", () => {
			expect(isStatusData({})).toBe(false);
			expect(isUpdateData({})).toBe(false);
			expect(isLatestDataType({})).toBe(false);
		});

		it("should handle arrays", () => {
			expect(isStatusData([])).toBe(false);
			expect(isUpdateData([])).toBe(false);
			expect(isLatestDataType([])).toBe(false);
		});

		it("should handle primitive values", () => {
			expect(isStatusData("string")).toBe(false);
			expect(isUpdateData(123)).toBe(false);
			expect(isLatestDataType(true)).toBe(false);
		});
	});
});
