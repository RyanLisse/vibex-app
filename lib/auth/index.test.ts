import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
Auth, type AuthInfo } from "@/lib/auth/index";

// Mock fs/promises module
mock.module("node:fs/promises", () => ({
	default: {
		mkdir: mock(),
		readFile: mock(),
		writeFile: mock(),
		chmod: mock(),
	},
}));

describe.skip("Auth", () => {
	const mockDataDir = path.join(process.cwd(), ".auth");
	const mockFilepath = path.join(mockDataDir, "auth.json");

	const oauthAuth: AuthInfo = {
		type: "oauth",
		refresh: "test-refresh-token",
		access: "test-access-token",
		expires: Date.now() + 3_600_000, // 1 hour from now
	};

	const apiAuth: AuthInfo = {
		type: "api",
		key: "test-api-key",
	};

	let mkdirMock: ReturnType<typeof mock>;
	let readFileMock: ReturnType<typeof mock>;
	let writeFileMock: ReturnType<typeof mock>;
	let chmodMock: ReturnType<typeof mock>;

	beforeEach(() => {
		vi.clearAllMocks();
		// Set up mock references
		mkdirMock = fs.mkdir as ReturnType<typeof mock>;
		readFileMock = fs.readFile as ReturnType<typeof mock>;
		writeFileMock = fs.writeFile as ReturnType<typeof mock>;
		chmodMock = fs.chmod as ReturnType<typeof mock>;

		// Set default mock behaviors
		mkdirMock.mockResolvedValue(undefined);
		chmodMock.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("get", () => {
		it("should return OAuth auth info when provider exists", async () => {
			const mockData = {
				provider1: oauthAuth,
				provider2: apiAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(mockData));

			const result = await Auth.get("provider1");

			expect(result).toEqual(oauthAuth);
			expect(mkdirMock).toHaveBeenCalledWith(mockDataDir, { recursive: true });
			expect(readFileMock).toHaveBeenCalledWith(mockFilepath, "utf-8");
		});

		it("should return API auth info when provider exists", async () => {
			const mockData = {
				provider1: oauthAuth,
				provider2: apiAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(mockData));

			const result = await Auth.get("provider2");

			expect(result).toEqual(apiAuth);
		});

		it("should return undefined when provider does not exist", async () => {
			const mockData = {
				provider1: oauthAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(mockData));

			const result = await Auth.get("nonexistent");

			expect(result).toBeUndefined();
		});

		it("should return undefined when auth data is invalid", async () => {
			const mockData = {
				provider1: { type: "invalid", data: "test" },
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(mockData));

			const result = await Auth.get("provider1");

			expect(result).toBeUndefined();
		});

		it("should return undefined when file does not exist", async () => {
			readFileMock.mockRejectedValueOnce(new Error("ENOENT"));

			const result = await Auth.get("provider1");

			expect(result).toBeUndefined();
		});

		it("should return undefined when file contains invalid JSON", async () => {
			readFileMock.mockResolvedValueOnce("invalid json");

			const result = await Auth.get("provider1");

			expect(result).toBeUndefined();
		});

		it("should handle mkdir failure gracefully", async () => {
			mkdirMock.mockRejectedValueOnce(new Error("Permission denied"));
			readFileMock.mockResolvedValueOnce(
JSON.stringify({ provider1: oauthAuth }),
			);

			const result = await Auth.get("provider1");

			expect(result).toEqual(oauthAuth);
		});
	});

	describe("all", () => {
		it("should return all auth info", async () => {
			const mockData = {
				provider1: oauthAuth,
				provider2: apiAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(mockData));

			const result = await Auth.all();

			expect(result).toEqual(mockData);
			expect(mkdirMock).toHaveBeenCalledWith(mockDataDir, { recursive: true });
			expect(readFileMock).toHaveBeenCalledWith(mockFilepath, "utf-8");
		});

		it("should return empty object when file does not exist", async () => {
			readFileMock.mockRejectedValueOnce(new Error("ENOENT"));

			const result = await Auth.all();

			expect(result).toEqual({});
		});

		it("should return empty object when file contains invalid JSON", async () => {
			readFileMock.mockResolvedValueOnce("invalid json");

			const result = await Auth.all();

			expect(result).toEqual({});
		});
	});

	describe("set", () => {
		it("should save OAuth auth info", async () => {
			const existingData = {
				provider1: apiAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(existingData));
			writeFileMock.mockResolvedValueOnce(undefined);

			await Auth.set("provider2", oauthAuth);

			expect(writeFileMock).toHaveBeenCalledWith(
				mockFilepath,
JSON.stringify(
					{
						provider1: apiAuth,
						provider2: oauthAuth,
					},
					null,
					2,
				),
			);
			expect(chmodMock).toHaveBeenCalledWith(mockFilepath, 0o600);
		});

		it("should save API auth info", async () => {
			readFileMock.mockRejectedValueOnce(new Error("ENOENT")); // No existing file
			writeFileMock.mockResolvedValueOnce(undefined);

			await Auth.set("provider1", apiAuth);

			expect(writeFileMock).toHaveBeenCalledWith(
				mockFilepath,
JSON.stringify(
					{
						provider1: apiAuth,
					},
					null,
					2,
				),
			);
			expect(chmodMock).toHaveBeenCalledWith(mockFilepath, 0o600);
		});

		it("should overwrite existing auth info for same provider", async () => {
			const existingData = {
				provider1: oauthAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(existingData));
			writeFileMock.mockResolvedValueOnce(undefined);

			const newAuth: AuthInfo = {
				type: "api",
				key: "new-api-key",
			};

			await Auth.set("provider1", newAuth);

			expect(writeFileMock).toHaveBeenCalledWith(
				mockFilepath,
JSON.stringify(
					{
						provider1: newAuth,
					},
					null,
					2,
				),
			);
		});

		it("should handle write errors", async () => {
			readFileMock.mockResolvedValueOnce(JSON.stringify({}));
			writeFileMock.mockRejectedValueOnce(new Error("Permission denied"));

			await expect(Auth.set("provider1", apiAuth)).rejects.toThrow(
				"Permission denied",
			);
		});

		it("should handle chmod errors", async () => {
			readFileMock.mockResolvedValueOnce(JSON.stringify({}));
			writeFileMock.mockResolvedValueOnce(undefined);
			chmodMock.mockRejectedValueOnce(new Error("Permission denied"));

			await expect(Auth.set("provider1", apiAuth)).rejects.toThrow(
				"Permission denied",
			);
		});
	});

	describe("remove", () => {
		it("should remove auth info for provider", async () => {
			const existingData = {
				provider1: oauthAuth,
				provider2: apiAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(existingData));
			writeFileMock.mockResolvedValueOnce(undefined);

			await Auth.remove("provider1");

			expect(writeFileMock).toHaveBeenCalledWith(
				mockFilepath,
JSON.stringify(
					{
						provider2: apiAuth,
					},
					null,
					2,
				),
			);
			expect(chmodMock).toHaveBeenCalledWith(mockFilepath, 0o600);
		});

		it("should handle removing non-existent provider", async () => {
			const existingData = {
				provider1: oauthAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(existingData));
			writeFileMock.mockResolvedValueOnce(undefined);

			await Auth.remove("nonexistent");

			expect(writeFileMock).toHaveBeenCalledWith(
				mockFilepath,
JSON.stringify(
					{
						provider1: oauthAuth,
					},
					null,
					2,
				),
			);
		});

		it("should handle removing from empty file", async () => {
			readFileMock.mockRejectedValueOnce(new Error("ENOENT"));
			writeFileMock.mockResolvedValueOnce(undefined);

			await Auth.remove("provider1");

			expect(writeFileMock).toHaveBeenCalledWith(
				mockFilepath,
JSON.stringify({}, null, 2),
			);
		});

		it("should handle write errors during removal", async () => {
			readFileMock.mockResolvedValueOnce(
JSON.stringify({ provider1: oauthAuth }),
			);
			writeFileMock.mockRejectedValueOnce(new Error("Disk full"));

			await expect(Auth.remove("provider1")).rejects.toThrow("Disk full");
		});
	});

	describe("data validation", () => {
		it("should validate OAuth auth structure", async () => {
			const invalidOauth = {
				provider1: {
					type: "oauth",
					refresh: "token",
					// missing access and expires
				},
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(invalidOauth));

			const result = await Auth.get("provider1");

			expect(result).toBeUndefined();
		});

		it("should validate API auth structure", async () => {
			const invalidApi = {
				provider1: {
					type: "api",
					// missing key
				},
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(invalidApi));

			const result = await Auth.get("provider1");

			expect(result).toBeUndefined();
		});

		it("should handle mixed valid and invalid auth entries", async () => {
			const mixedData = {
				valid: oauthAuth,
				invalid: { type: "unknown" },
				valid2: apiAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(mixedData));

			const allData = await Auth.all();

			// All data is returned, validation happens on get()
			expect(allData).toEqual(mixedData);

			// Reset mocks for individual get calls
			readFileMock.mockResolvedValue(JSON.stringify(mixedData));

			const validResult = await Auth.get("valid");
			expect(validResult).toEqual(oauthAuth);

			const invalidResult = await Auth.get("invalid");
			expect(invalidResult).toBeUndefined();
		});
	});

	describe("concurrent operations", () => {
		it("should handle concurrent reads", async () => {
			const mockData = {
				provider1: oauthAuth,
				provider2: apiAuth,
			};

			readFileMock.mockResolvedValue(JSON.stringify(mockData));

			const results = await Promise.all([
Auth.get("provider1"),
Auth.get("provider2"),
Auth.all(),
			]);

			expect(results[0]).toEqual(oauthAuth);
			expect(results[1]).toEqual(apiAuth);
			expect(results[2]).toEqual(mockData);
		});

		it("should handle concurrent writes", async () => {
			readFileMock.mockResolvedValue(JSON.stringify({}));
			writeFileMock.mockResolvedValue(undefined);

			const newAuth1: AuthInfo = { type: "api", key: "key1" };
			const newAuth2: AuthInfo = { type: "api", key: "key2" };

			// Note: In real scenarios, this could cause race conditions
			// The test demonstrates the API usage, but the implementation
			// might need locking for production use
			await Promise.all([
Auth.set("provider1", newAuth1),
Auth.set("provider2", newAuth2),
			]);

			expect(writeFileMock).toHaveBeenCalled();
		});
	});

	describe("file permissions", () => {
		it("should set correct permissions on new file", async () => {
			readFileMock.mockRejectedValueOnce(new Error("ENOENT"));
			writeFileMock.mockResolvedValueOnce(undefined);

			await Auth.set("provider1", apiAuth);

			expect(chmodMock).toHaveBeenCalledWith(mockFilepath, 0o600);
		});

		it("should maintain permissions on update", async () => {
			readFileMock.mockResolvedValueOnce(
JSON.stringify({ existing: oauthAuth }),
			);
			writeFileMock.mockResolvedValueOnce(undefined);

			await Auth.set("new", apiAuth);

			expect(chmodMock).toHaveBeenCalledWith(mockFilepath, 0o600);
		});
	});

	describe("edge cases", () => {
		it("should handle very long auth tokens", async () => {
			const longTokenAuth: AuthInfo = {
				type: "oauth",
				refresh: "x".repeat(1000),
				access: "y".repeat(1000),
				expires: Date.now() + 3_600_000,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify({}));
			writeFileMock.mockResolvedValueOnce(undefined);

			await Auth.set("provider1", longTokenAuth);

			expect(writeFileMock).toHaveBeenCalledWith(
				mockFilepath,
				expect.stringContaining("x".repeat(1000)),
			);
		});

		it("should handle special characters in provider names", async () => {
			const specialProviders = {
				"provider/with/slashes": oauthAuth,
				"provider:with:colons": apiAuth,
				"provider@with@at": oauthAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(specialProviders));

			const result = await Auth.get("provider/with/slashes");

			expect(result).toEqual(oauthAuth);
		});

		it("should handle empty provider name", async () => {
			const data = {
				"": oauthAuth,
				normal: apiAuth,
			};

			readFileMock.mockResolvedValueOnce(JSON.stringify(data));

			const result = await Auth.get("");

			expect(result).toEqual(oauthAuth);
		});
	});
});
