/**
 * Standardized error handling test patterns
 * Eliminates duplicate error testing code
 */
import { expect } from "vitest";

/**
 * Standard error test pattern for async functions
 */
export const testAsyncError = async (
	testFn: () => Promise<any>,
	expectedMessage: string,
	errorType?: string
) => {
	try {
		await testFn();
		expect.fail("Expected function to throw an error");
	} catch (error: any) {
		expect(error.message).toBe(expectedMessage);
		if (errorType) {
			expect(error.name).toBe(errorType);
		}
	}
};

/**
 * Standard error test pattern for sync functions
 */
export const testSyncError = (
	testFn: () => any,
	expectedMessage: string,
	errorType?: string
) => {
	try {
		testFn();
		expect.fail("Expected function to throw an error");
	} catch (error: any) {
		expect(error.message).toBe(expectedMessage);
		if (errorType) {
			expect(error.name).toBe(errorType);
		}
	}
};

/**
 * Standard validation error test
 */
export const testValidationError = (
	result: { isValid: boolean; errors: string[] },
	expectedErrors: string[]
) => {
	expect(result.isValid).toBe(false);
	for (const expectedError of expectedErrors) {
		expect(result.errors).toContain(expectedError);
	}
};

/**
 * Standard success validation test
 */
export const testValidationSuccess = (
	result: { isValid: boolean; errors: string[] }
) => {
	expect(result.isValid).toBe(true);
	expect(result.errors).toEqual([]);
};

/**
 * Standard network error patterns
 */
export const createNetworkErrorTests = (mockHandler: any, requestFn: () => Promise<any>) => {
	return {
		async testNetworkError() {
			mockHandler.mockImplementation(
				Promise.reject(new Error("Network error"))
			);
			await testAsyncError(requestFn, "Network error");
		},

		async testTimeoutError() {
			mockHandler.mockImplementation(() => {
				return new Promise((_, reject) => {
					setTimeout(() => reject(new Error("Timeout")), 100);
				});
			});
			await testAsyncError(requestFn, "Timeout");
		},

		async testRateLimitError() {
			const error = new Error("Rate limit exceeded");
			error.name = "RateLimitError";
			mockHandler.mockImplementation(() => Promise.reject(error));
			await testAsyncError(requestFn, "Rate limit exceeded", "RateLimitError");
		}
	};
};

/**
 * HTTP status code test patterns
 */
export const createHttpStatusTests = (
	mockHandler: any,
	requestFn: () => Promise<Response>
) => {
	return {
		async testSuccessResponse(expectedBody: string) {
			const mockResponse = new Response(expectedBody);
			mockHandler.mockImplementation(() => Promise.resolve(mockResponse));
			const response = await requestFn();
			expect(response).toBe(mockResponse);
		},

		async testErrorResponse(status: number, expectedBody: string) {
			const mockResponse = new Response(expectedBody, { status });
			mockHandler.mockImplementation(() => Promise.resolve(mockResponse));
			const response = await requestFn();
			expect(response).toBe(mockResponse);
		},

		async testUnauthorizedError() {
			await this.testErrorResponse(401, "Unauthorized");
		},

		async testNotFoundError() {
			await this.testErrorResponse(404, "Not Found");
		},

		async testServerError() {
			await this.testErrorResponse(500, "Internal Server Error");
		}
	};
};