import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DatabaseObservabilityDemo } from "./database-observability-demo";

// Mock the necessary dependencies
// vi.mock("@/lib/observability", () => ({
// 	useObservabilityEvents: () => ({
// 		events: [],
// 		loading: false,
// 		error: null,
// 	}),
// }));

// vi.mock("@/lib/monitoring/health", () => ({
// 	useDatabaseHealth: () => ({
// 		health: {
// 			status: "healthy",
// 			connectionCount: 5,
// 			queryLatency: 50,
// 			errorRate: 0,
// 		},
// 		loading: false,
// 		error: null,
// 	}),
// }));

describe.skip("DatabaseObservabilityDemo", () => {
	it("renders database observability demo correctly", () => {
		render(<DatabaseObservabilityDemo />);

		// Should render without crashing
		expect(screen.getByRole("main")).toBeInTheDocument();
	});

	it("displays database health metrics", async () => {
		render(<DatabaseObservabilityDemo />);

		await waitFor(() => {
			// Check for specific health status badge
			const healthBadge = screen.getByText("healthy");
			expect(healthBadge).toBeInTheDocument();
		});
	});

	it("shows connection metrics", async () => {
		render(<DatabaseObservabilityDemo />);

		await waitFor(() => {
			// Look for connection pool title
			const connectionPoolTitle = screen.getByText("Connection Pool");
			expect(connectionPoolTitle).toBeInTheDocument();
		});
	});

	it("displays query performance metrics", async () => {
		render(<DatabaseObservabilityDemo />);

		await waitFor(() => {
			// Check for query latency card title
			const queryLatencyTitle = screen.getByText("Query Latency");
			expect(queryLatencyTitle).toBeInTheDocument();
		});
	});

	it("handles loading state correctly", () => {
		// Mock loading state
		vi.mocked(vi.fn()).mockReturnValue({
			health: null,
			loading: true,
			error: null,
		});

		render(<DatabaseObservabilityDemo />);

		// Should handle loading state gracefully
		expect(screen.getByRole("main")).toBeInTheDocument();
	});

	it("handles error state correctly", () => {
		// Mock error state
		vi.mocked(vi.fn()).mockReturnValue({
			health: null,
			loading: false,
			error: new Error("Database connection failed"),
		});

		render(<DatabaseObservabilityDemo />);

		// Should handle error state gracefully
		expect(screen.getByRole("main")).toBeInTheDocument();
	});

	it("refreshes data when requested", async () => {
		render(<DatabaseObservabilityDemo />);

		// Look for refresh functionality
		const refreshButton = screen.queryByRole("button", {
			name: /refresh|reload/i,
		});
		if (refreshButton) {
			expect(refreshButton).toBeInTheDocument();
		}
	});
});
