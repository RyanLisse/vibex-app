/**
 * Integration Tests for Observability Events System
 *
 * Tests end-to-end workflows for event collection, storage, querying,
 * and OpenTelemetry integration.
 */

import { ObservabilityEventQuery,
	type ObservabilityEventType,
	observabilityEvents
} from "@/lib/observability/events";

// Mock OpenTelemetry
vi.mock("@opentelemetry/api", () => ({
	trace: {
		getTracer: vi.fn(() => ({
			startSpan: vi.fn(() => ({
				end: vi.fn(),
				setStatus: vi.fn(),
				spanContext: () => ({
					traceId: "mock-trace-id",
					spanId: "mock-span-id",
				}),
			})),
		})),
		getActiveSpan: vi.fn(() => ({
			spanContext: () => ({
				traceId: "mock-trace-id",
				spanId: "mock-span-id",
			}),
		})),
	},
SpanKind: {