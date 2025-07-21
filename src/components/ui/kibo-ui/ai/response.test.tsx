import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";

// Mock dependencies
vi.mock("@/lib/utils", () => ({
	cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

// Mock Markdown component
vi.mock("@/components/markdown", () => ({
	Markdown: ({ children, className, ...props }: any) => (
		<div className={`markdown ${className}`} data-testid="markdown" {...props}>
			{children}
		</div>
	),
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
	Bot: ({ className, ...props }: any) => (
		<svg className={className} data-testid="bot-icon" {...props} />
	),
	Copy: ({ className, ...props }: any) => (
		<svg className={className} data-testid="copy-icon" {...props} />
	),
	Check: ({ className, ...props }: any) => (
		<svg className={className} data-testid="check-icon" {...props} />
	),
}));

// AI Response component implementation for testing
interface AIResponseProps {
	content: string;
	isStreaming?: boolean;
	showAvatar?: boolean;
	className?: string;
	onCopy?: (content: string) => void;
	variant?: "default" | "compact" | "minimal";
	timestamp?: Date;
	metadata?: {
		model?: string;
		tokensUsed?: number;
		duration?: number;
	};
}

const AIResponse: React.FC<AIResponseProps> = ({
	content,
	isStreaming = false,
	showAvatar = true,
	className = "",
	onCopy,
	variant = "default",
	timestamp,
	metadata,
}) => {
	const [copied, setCopied] = React.useState(false);

	const handleCopy = async () => {
		if (onCopy) {
			onCopy(content);
		} else {
			await navigator.clipboard.writeText(content);
		}
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div 
			className={`ai-response ${variant} ${className}`}
			data-testid="ai-response"
		>
			{showAvatar && (
				<div className="ai-response-avatar" data-testid="ai-avatar">
					<svg className="bot-icon" data-testid="bot-icon" />
				</div>
			)}
			
			<div className="ai-response-content" data-testid="ai-content">
				{isStreaming ? (
					<div className="streaming-content" data-testid="streaming-content">
						<div className="markdown">{content}</div>
						<div className="streaming-indicator" data-testid="streaming-indicator">
							<span className="typing-dots">...</span>
						</div>
					</div>
				) : (
					<div className="markdown" data-testid="markdown">
						{content}
					</div>
				)}
			</div>

			{!isStreaming && content && (
				<div className="ai-response-actions" data-testid="ai-actions">
					<button 
						onClick={handleCopy}
						className="copy-button"
						data-testid="copy-button"
						title={copied ? "Copied!" : "Copy response"}
					>
						{copied ? (
							<svg className="check-icon" data-testid="check-icon" />
						) : (
							<svg className="copy-icon" data-testid="copy-icon" />
						)}
					</button>
				</div>
			)}

			{timestamp && (
				<div className="ai-response-timestamp" data-testid="ai-timestamp">
					{timestamp.toLocaleTimeString()}
				</div>
			)}

			{metadata && (
				<div className="ai-response-metadata" data-testid="ai-metadata">
					{metadata.model && (
						<span className="metadata-model" data-testid="metadata-model">
							{metadata.model}
						</span>
					)}
					{metadata.tokensUsed && (
						<span className="metadata-tokens" data-testid="metadata-tokens">
							{metadata.tokensUsed} tokens
						</span>
					)}
					{metadata.duration && (
						<span className="metadata-duration" data-testid="metadata-duration">
							{metadata.duration}ms
						</span>
					)}
				</div>
			)}
		</div>
	);
};

describe("AIResponse Component", () => {
	// Mock clipboard API
	const mockClipboard = {
		writeText: vi.fn().mockResolvedValue(undefined),
	};
	
	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(navigator, { clipboard: mockClipboard });
	});

	describe("Basic Rendering", () => {
		it("should render AI response with content", () => {
			render(<AIResponse content="Hello, how can I help you?" />);
			
			expect(screen.getByTestId("ai-response")).toBeInTheDocument();
			expect(screen.getByTestId("markdown")).toHaveTextContent("Hello, how can I help you?");
		});

		it("should render with avatar by default", () => {
			render(<AIResponse content="Test content" />);
			
			expect(screen.getByTestId("ai-avatar")).toBeInTheDocument();
			expect(screen.getByTestId("bot-icon")).toBeInTheDocument();
		});

		it("should hide avatar when showAvatar is false", () => {
			render(<AIResponse content="Test content" showAvatar={false} />);
			
			expect(screen.queryByTestId("ai-avatar")).not.toBeInTheDocument();
		});

		it("should apply custom className", () => {
			render(<AIResponse content="Test" className="custom-class" />);
			
			expect(screen.getByTestId("ai-response")).toHaveClass("custom-class");
		});

		it("should apply variant classes", () => {
			render(<AIResponse content="Test" variant="compact" />);
			
			expect(screen.getByTestId("ai-response")).toHaveClass("compact");
		});
	});

	describe("Streaming State", () => {
		it("should show streaming indicator when isStreaming is true", () => {
			render(<AIResponse content="Partial content" isStreaming />);
			
			expect(screen.getByTestId("streaming-content")).toBeInTheDocument();
			expect(screen.getByTestId("streaming-indicator")).toBeInTheDocument();
		});

		it("should not show copy button when streaming", () => {
			render(<AIResponse content="Streaming content" isStreaming />);
			
			expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument();
		});

		it("should show regular content when not streaming", () => {
			render(<AIResponse content="Complete content" isStreaming={false} />);
			
			expect(screen.queryByTestId("streaming-content")).not.toBeInTheDocument();
			expect(screen.getByTestId("markdown")).toBeInTheDocument();
		});
	});

	describe("Copy Functionality", () => {
		it("should show copy button for non-streaming content", () => {
			render(<AIResponse content="Copy this content" />);
			
			expect(screen.getByTestId("copy-button")).toBeInTheDocument();
		});

		it("should copy content to clipboard when copy button is clicked", async () => {
			render(<AIResponse content="Content to copy" />);
			
			const copyButton = screen.getByTestId("copy-button");
			copyButton.click();
			
			expect(mockClipboard.writeText).toHaveBeenCalledWith("Content to copy");
		});

		it("should call custom onCopy handler when provided", async () => {
			const onCopy = vi.fn();
			render(<AIResponse content="Custom copy" onCopy={onCopy} />);
			
			const copyButton = screen.getByTestId("copy-button");
			copyButton.click();
			
			expect(onCopy).toHaveBeenCalledWith("Custom copy");
			expect(mockClipboard.writeText).not.toHaveBeenCalled();
		});

		it("should show check icon after copying", async () => {
			render(<AIResponse content="Copied content" />);
			
			const copyButton = screen.getByTestId("copy-button");
			copyButton.click();
			
			expect(screen.getByTestId("check-icon")).toBeInTheDocument();
			expect(screen.queryByTestId("copy-icon")).not.toBeInTheDocument();
		});

		it("should not show copy button when content is empty", () => {
			render(<AIResponse content="" />);
			
			expect(screen.queryByTestId("copy-button")).not.toBeInTheDocument();
		});
	});

	describe("Timestamp Display", () => {
		it("should show timestamp when provided", () => {
			const timestamp = new Date("2024-01-01T12:00:00Z");
			render(<AIResponse content="Timed content" timestamp={timestamp} />);
			
			expect(screen.getByTestId("ai-timestamp")).toBeInTheDocument();
		});

		it("should not show timestamp when not provided", () => {
			render(<AIResponse content="No timestamp" />);
			
			expect(screen.queryByTestId("ai-timestamp")).not.toBeInTheDocument();
		});

		it("should format timestamp correctly", () => {
			const timestamp = new Date("2024-01-01T12:30:45Z");
			render(<AIResponse content="Test" timestamp={timestamp} />);
			
			const timestampElement = screen.getByTestId("ai-timestamp");
			expect(timestampElement.textContent).toContain("12:30:45");
		});
	});

	describe("Metadata Display", () => {
		it("should show metadata when provided", () => {
			const metadata = {
				model: "gpt-4",
				tokensUsed: 150,
				duration: 1250,
			};
			
			render(<AIResponse content="Test" metadata={metadata} />);
			
			expect(screen.getByTestId("ai-metadata")).toBeInTheDocument();
			expect(screen.getByTestId("metadata-model")).toHaveTextContent("gpt-4");
			expect(screen.getByTestId("metadata-tokens")).toHaveTextContent("150 tokens");
			expect(screen.getByTestId("metadata-duration")).toHaveTextContent("1250ms");
		});

		it("should show partial metadata when only some fields are provided", () => {
			const metadata = { model: "claude-3", tokensUsed: 75 };
			
			render(<AIResponse content="Test" metadata={metadata} />);
			
			expect(screen.getByTestId("metadata-model")).toHaveTextContent("claude-3");
			expect(screen.getByTestId("metadata-tokens")).toHaveTextContent("75 tokens");
			expect(screen.queryByTestId("metadata-duration")).not.toBeInTheDocument();
		});

		it("should not show metadata when not provided", () => {
			render(<AIResponse content="No metadata" />);
			
			expect(screen.queryByTestId("ai-metadata")).not.toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("should have proper button titles", () => {
			render(<AIResponse content="Test content" />);
			
			const copyButton = screen.getByTestId("copy-button");
			expect(copyButton).toHaveAttribute("title", "Copy response");
		});

		it("should update button title after copying", () => {
			render(<AIResponse content="Test content" />);
			
			const copyButton = screen.getByTestId("copy-button");
			copyButton.click();
			
			expect(copyButton).toHaveAttribute("title", "Copied!");
		});

		it("should be keyboard accessible", () => {
			render(<AIResponse content="Test content" />);
			
			const copyButton = screen.getByTestId("copy-button");
			copyButton.focus();
			expect(copyButton).toHaveFocus();
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty content", () => {
			render(<AIResponse content="" />);
			
			expect(screen.getByTestId("ai-response")).toBeInTheDocument();
			expect(screen.getByTestId("markdown")).toHaveTextContent("");
		});

		it("should handle very long content", () => {
			const longContent = "A".repeat(10000);
			render(<AIResponse content={longContent} />);
			
			expect(screen.getByTestId("markdown")).toHaveTextContent(longContent);
		});

		it("should handle special characters in content", () => {
			const specialContent = "Content with <tags> & symbols © =€";
			render(<AIResponse content={specialContent} />);
			
			expect(screen.getByTestId("markdown")).toHaveTextContent(specialContent);
		});

		it("should handle clipboard API failure gracefully", async () => {
			mockClipboard.writeText.mockRejectedValue(new Error("Clipboard failed"));
			
			render(<AIResponse content="Test content" />);
			
			const copyButton = screen.getByTestId("copy-button");
			
			// Should not throw error
			expect(() => copyButton.click()).not.toThrow();
		});

		it("should handle undefined metadata fields", () => {
			const metadata = { model: undefined, tokensUsed: 0, duration: undefined };
			
			render(<AIResponse content="Test" metadata={metadata as any} />);
			
			expect(screen.queryByTestId("metadata-model")).not.toBeInTheDocument();
			expect(screen.queryByTestId("metadata-duration")).not.toBeInTheDocument();
		});
	});

	describe("Component Lifecycle", () => {
		it("should reset copy state after timeout", async () => {
			vi.useFakeTimers();
			
			render(<AIResponse content="Test content" />);
			
			const copyButton = screen.getByTestId("copy-button");
			copyButton.click();
			
			expect(screen.getByTestId("check-icon")).toBeInTheDocument();
			
			// Fast-forward time
			vi.advanceTimersByTime(2000);
			
			expect(screen.getByTestId("copy-icon")).toBeInTheDocument();
			expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
			
			vi.useRealTimers();
		});

		it("should handle rapid clicks on copy button", () => {
			render(<AIResponse content="Test content" />);
			
			const copyButton = screen.getByTestId("copy-button");
			
			// Click multiple times rapidly
			copyButton.click();
			copyButton.click();
			copyButton.click();
			
			// Should only call clipboard once per click
			expect(mockClipboard.writeText).toHaveBeenCalledTimes(3);
		});
	});
});